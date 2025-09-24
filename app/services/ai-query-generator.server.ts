import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { graphqlIntrospectionService } from "./graphql-introspection.server";

// Schema for structured AI output
const QueryAnalysisSchema = z.object({
  operation: z.enum(["products", "orders", "customers", "collections"]),
  intent: z.enum(["list", "search", "filter", "count", "details"]),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "contains", "greater_than", "less_than", "between"]),
    value: z.string()
  })).optional(),
  fields: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(10),
  searchTerm: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC")
});

type QueryAnalysis = z.infer<typeof QueryAnalysisSchema>;

export class AIQueryGeneratorService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || "";
    if (!this.openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
  }

  /**
   * Analyze user query using OpenAI and generate structured output
   */
  async analyzeQuery(userQuery: string): Promise<QueryAnalysis> {
    try {
      const { object } = await generateObject({
        model: openai("gpt-4-turbo"),
        schema: QueryAnalysisSchema,
        prompt: `
Analyze this Shopify store query and extract structured information:

User Query: "${userQuery}"

Instructions:
- Determine the main operation (products, orders, customers, or collections)
- Identify the intent (list all, search for specific items, filter by criteria, etc.)
- Extract any filters or search terms
- Determine what fields the user might want to see
- Set appropriate limits and sorting

Examples:
- "show me products with low inventory" → operation: products, filters: inventory < 10
- "find orders from last week" → operation: orders, filters: createdAt > last week
- "get customers who bought Nike products" → operation: customers, searchTerm: Nike
- "list all collections" → operation: collections, intent: list

Respond with structured JSON only.
        `,
        temperature: 0.1, // Low temperature for consistent structured output
      });

      return object;
    } catch (error) {
      console.error("AI query analysis failed:", error);

      // Fallback to simple pattern matching
      return this.fallbackAnalysis(userQuery);
    }
  }

  /**
   * Generate optimized GraphQL query using AI analysis and schema introspection
   */
  async generateGraphQLQuery(
    admin: AdminApiContext,
    userQuery: string
  ): Promise<{
    query: string;
    variables: Record<string, any>;
    explanation: string;
    analysis: QueryAnalysis;
  }> {
    // Step 1: Analyze the query with AI
    const analysis = await this.analyzeQuery(userQuery);

    // Step 2: Get schema information for the operation
    const availableFields = await graphqlIntrospectionService.getTypeFields(
      admin,
      this.getShopifyTypeName(analysis.operation)
    );

    // Step 3: Generate optimized field selection
    const selectedFields = await this.selectOptimalFields(
      availableFields.map(f => f.name),
      analysis,
      userQuery
    );

    // Step 4: Build GraphQL query
    const { query, variables } = await this.buildAdvancedQuery(
      analysis,
      selectedFields,
      availableFields
    );

    // Step 5: Generate human explanation
    const explanation = await this.generateExplanation(userQuery, analysis, query);

    return {
      query,
      variables,
      explanation,
      analysis
    };
  }

  /**
   * Use AI to select the most relevant fields based on user query
   */
  private async selectOptimalFields(
    availableFields: string[],
    analysis: QueryAnalysis,
    userQuery: string
  ): Promise<string[]> {
    try {
      const { text } = await generateText({
        model: openai("gpt-4-turbo"),
        prompt: `
Given this user query: "${userQuery}"
And these available GraphQL fields: ${availableFields.join(", ")}

Select the 5-8 most relevant fields that would answer the user's question.
Always include "id" and at least one display field (title, name, displayName).

Consider:
- What information would be most useful for this query?
- What fields relate to the user's intent?
- Include fields for filtering criteria mentioned

Return ONLY a comma-separated list of field names, no explanations.

Example: id, title, status, createdAt, totalInventory
        `,
        temperature: 0.2,
      });

      const fields = text.trim().split(",").map(f => f.trim());

      // Ensure we have essential fields
      const essentialFields = ["id"];
      const displayFields = ["title", "name", "displayName"];
      const hasDisplayField = fields.some(f => displayFields.includes(f));

      if (!hasDisplayField) {
        const availableDisplayField = availableFields.find(f => displayFields.includes(f));
        if (availableDisplayField) {
          fields.push(availableDisplayField);
        }
      }

      return [...new Set([...essentialFields, ...fields])].slice(0, 8);
    } catch (error) {
      console.error("AI field selection failed:", error);
      // Fallback to basic field selection
      return this.getBasicFields(analysis.operation);
    }
  }

  /**
   * Build advanced GraphQL query with AI-driven structure
   */
  private async buildAdvancedQuery(
    analysis: QueryAnalysis,
    selectedFields: string[],
    availableFields: any[]
  ): Promise<{ query: string; variables: Record<string, any> }> {
    const variables: Record<string, any> = {
      first: analysis.limit
    };

    // Build query string from search term and filters
    const queryParts: string[] = [];

    if (analysis.searchTerm) {
      queryParts.push(analysis.searchTerm);
    }

    if (analysis.filters) {
      for (const filter of analysis.filters) {
        switch (filter.operator) {
          case "equals":
            queryParts.push(`${filter.field}:${filter.value}`);
            break;
          case "contains":
            queryParts.push(`${filter.field}:*${filter.value}*`);
            break;
          case "greater_than":
            queryParts.push(`${filter.field}:>${filter.value}`);
            break;
          case "less_than":
            queryParts.push(`${filter.field}:<${filter.value}`);
            break;
        }
      }
    }

    if (queryParts.length > 0) {
      variables.query = queryParts.join(" AND ");
    }

    // Add sorting if specified
    if (analysis.sortBy) {
      variables.sortKey = this.mapSortField(analysis.sortBy, analysis.operation);
      variables.reverse = analysis.sortOrder === "DESC";
    }

    // Build the GraphQL query string
    const operationName = analysis.operation;
    const queryName = `get${operationName.charAt(0).toUpperCase() + operationName.slice(1)}`;

    let queryArgs = "($first: Int!";
    if (variables.query) queryArgs += ", $query: String";
    if (variables.sortKey) queryArgs += ", $sortKey: ProductSortKeys, $reverse: Boolean";
    queryArgs += ")";

    let operationArgs = "(first: $first";
    if (variables.query) operationArgs += ", query: $query";
    if (variables.sortKey) operationArgs += ", sortKey: $sortKey, reverse: $reverse";
    operationArgs += ")";

    const query = `#graphql
query ${queryName}${queryArgs} {
  ${operationName}${operationArgs} {
    edges {
      node {
        ${selectedFields.join('\n        ')}
        ${this.addNestedFields(analysis, selectedFields)}
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

    return { query, variables };
  }

  /**
   * Add nested fields based on analysis (variants, customers, etc.)
   */
  private addNestedFields(analysis: QueryAnalysis, selectedFields: string[]): string {
    let nestedFields = "";

    if (analysis.operation === "products") {
      // Add variants if price-related query
      if (analysis.filters?.some(f => f.field.includes("price")) ||
          selectedFields.includes("price")) {
        nestedFields += `
        variants(first: 3) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              availableForSale
            }
          }
        }`;
      }

      // Add media if visual query
      if (selectedFields.includes("image") || selectedFields.includes("media")) {
        nestedFields += `
        featuredMedia {
          preview {
            image {
              url
              altText
            }
          }
        }`;
      }
    }

    if (analysis.operation === "orders") {
      // Add customer info for customer-related queries
      if (analysis.filters?.some(f => f.field.includes("customer")) ||
          selectedFields.includes("customer")) {
        nestedFields += `
        customer {
          id
          displayName
          email
        }`;
      }

      // Add line items for product-related order queries
      if (analysis.filters?.some(f => f.field.includes("product")) ||
          selectedFields.includes("lineItems")) {
        nestedFields += `
        lineItems(first: 3) {
          edges {
            node {
              id
              title
              quantity
              originalUnitPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }`;
      }
    }

    return nestedFields;
  }

  /**
   * Generate human-readable explanation using AI
   */
  private async generateExplanation(
    userQuery: string,
    analysis: QueryAnalysis,
    generatedQuery: string
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `
Create a brief, friendly explanation of what this GraphQL query does for the user.

User asked: "${userQuery}"
Query analysis: ${JSON.stringify(analysis)}

Write 2-3 sentences explaining:
1. What data we're fetching
2. Any filters or search criteria applied
3. What fields are included

Keep it conversational and helpful. Don't mention technical GraphQL details.
        `,
        temperature: 0.7,
      });

      return text.trim();
    } catch (error) {
      console.error("AI explanation generation failed:", error);
      return `I generated a query to fetch ${analysis.operation} from your store${analysis.searchTerm ? ` matching "${analysis.searchTerm}"` : ''}. The query includes relevant fields and applies any filters you specified.`;
    }
  }

  /**
   * Fallback analysis when AI fails
   */
  private fallbackAnalysis(userQuery: string): QueryAnalysis {
    const lowerQuery = userQuery.toLowerCase();

    let operation: QueryAnalysis['operation'] = 'products';
    if (lowerQuery.includes('order')) operation = 'orders';
    else if (lowerQuery.includes('customer')) operation = 'customers';
    else if (lowerQuery.includes('collection')) operation = 'collections';

    return {
      operation,
      intent: 'list',
      limit: 10,
      sortOrder: 'DESC'
    };
  }

  private getShopifyTypeName(operation: string): string {
    const mapping = {
      products: 'Product',
      orders: 'Order',
      customers: 'Customer',
      collections: 'Collection'
    };
    return mapping[operation as keyof typeof mapping] || 'Product';
  }

  private getBasicFields(operation: string): string[] {
    const fieldMap = {
      products: ['id', 'title', 'status', 'totalInventory', 'createdAt'],
      orders: ['id', 'name', 'totalPriceSet', 'displayFinancialStatus', 'createdAt'],
      customers: ['id', 'displayName', 'email', 'phone', 'createdAt'],
      collections: ['id', 'title', 'handle', 'description', 'createdAt']
    };
    return fieldMap[operation as keyof typeof fieldMap] || fieldMap.products;
  }

  private mapSortField(sortBy: string, operation: string): string {
    // Map common sort terms to Shopify GraphQL sort keys
    const sortMappings = {
      products: {
        'created': 'CREATED_AT',
        'updated': 'UPDATED_AT',
        'title': 'TITLE',
        'inventory': 'INVENTORY_TOTAL',
        'price': 'PRICE'
      },
      orders: {
        'created': 'CREATED_AT',
        'updated': 'UPDATED_AT',
        'total': 'TOTAL_PRICE'
      }
    };

    const operationMappings = sortMappings[operation as keyof typeof sortMappings];
    return operationMappings?.[sortBy as keyof typeof operationMappings] || 'CREATED_AT';
  }
}

export const aiQueryGenerator = new AIQueryGeneratorService();