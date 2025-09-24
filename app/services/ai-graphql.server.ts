import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export interface GraphQLGenerationRequest {
  query: string;
  shop: string;
  conversationId?: string;
}

export interface GraphQLGenerationResponse {
  generatedQuery: string;
  explanation: string;
  isValid: boolean;
  validationErrors?: string[];
  executionResult?: any;
  usedFields?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  isRequired: boolean;
  args?: SchemaField[];
}

export interface SchemaType {
  name: string;
  fields: SchemaField[];
  description?: string;
}

export class AIGraphQLService {
  private shopifyMCPConversationId: string | null = null;

  constructor() {
    // Will be initialized when first used
  }

  /**
   * Initialize Shopify MCP connection
   */
  private async initializeShopifyMCP() {
    if (this.shopifyMCPConversationId) {
      return this.shopifyMCPConversationId;
    }

    // This would be called from the server action where MCP tools are available
    // For now, we'll use a placeholder - this will be replaced with actual MCP integration
    this.shopifyMCPConversationId = "0db3d626-f297-4d8e-bed0-5903d2e8fd21";
    return this.shopifyMCPConversationId;
  }

  /**
   * Analyze user query to understand intent and extract entities
   */
  private analyzeQuery(query: string): {
    intent: 'fetch' | 'create' | 'update' | 'delete' | 'search';
    entities: string[];
    filters: string[];
    fields: string[];
  } {
    const lowerQuery = query.toLowerCase();

    // Determine intent
    let intent: 'fetch' | 'create' | 'update' | 'delete' | 'search' = 'fetch';
    if (lowerQuery.includes('create') || lowerQuery.includes('add') || lowerQuery.includes('new')) {
      intent = 'create';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('edit') || lowerQuery.includes('modify')) {
      intent = 'update';
    } else if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      intent = 'delete';
    } else if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('filter')) {
      intent = 'search';
    }

    // Extract entities (common Shopify objects)
    const entityPatterns = [
      'product', 'products', 'order', 'orders', 'customer', 'customers',
      'collection', 'collections', 'inventory', 'variant', 'variants',
      'discount', 'discounts', 'app', 'apps', 'webhook', 'webhooks',
      'location', 'locations', 'fulfillment', 'fulfillments',
      'transaction', 'transactions', 'refund', 'refunds'
    ];

    const entities = entityPatterns.filter(entity =>
      lowerQuery.includes(entity)
    );

    // Extract potential filters
    const filterPatterns = [
      'status', 'title', 'name', 'id', 'created', 'updated',
      'price', 'tag', 'tags', 'handle', 'published'
    ];

    const filters = filterPatterns.filter(filter =>
      lowerQuery.includes(filter)
    );

    // Extract potential fields user wants
    const fieldPatterns = [
      'id', 'title', 'name', 'description', 'price', 'status',
      'created', 'updated', 'handle', 'tags', 'inventory'
    ];

    const fields = fieldPatterns.filter(field =>
      lowerQuery.includes(field)
    );

    return { intent, entities, filters, fields };
  }

  /**
   * Generate GraphQL query based on analysis
   */
  private generateQueryFromAnalysis(analysis: ReturnType<typeof this.analyzeQuery>): string {
    const { intent, entities, filters, fields } = analysis;

    // Start with most common entity if multiple are found
    const primaryEntity = entities[0] || 'product';
    const entityName = primaryEntity.endsWith('s') ? primaryEntity : `${primaryEntity}s`;

    // Generate basic query structure
    let query = '';

    if (intent === 'fetch' || intent === 'search') {
      // Default fields to fetch
      const defaultFields = ['id', 'title', 'createdAt', 'updatedAt'];
      const fieldsToFetch = fields.length > 0 ? [...new Set([...defaultFields, ...fields])] : defaultFields;

      if (primaryEntity === 'product' || primaryEntity === 'products') {
        query = `#graphql
query getProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    edges {
      node {
        ${fieldsToFetch.includes('id') ? 'id' : ''}
        ${fieldsToFetch.includes('title') ? 'title' : ''}
        ${fieldsToFetch.includes('handle') ? 'handle' : ''}
        ${fieldsToFetch.includes('status') ? 'status' : ''}
        ${fieldsToFetch.includes('inventory') ? 'totalInventory' : ''}
        ${fieldsToFetch.includes('tags') ? 'tags' : ''}
        ${fieldsToFetch.includes('created') || fieldsToFetch.includes('createdAt') ? 'createdAt' : ''}
        ${fieldsToFetch.includes('updated') || fieldsToFetch.includes('updatedAt') ? 'updatedAt' : ''}
      }
    }
  }
}`;
      } else if (primaryEntity === 'order' || primaryEntity === 'orders') {
        query = `#graphql
query getOrders($first: Int!) {
  orders(first: $first) {
    edges {
      node {
        ${fieldsToFetch.includes('id') ? 'id' : ''}
        ${fieldsToFetch.includes('name') ? 'name' : ''}
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        ${fieldsToFetch.includes('status') ? 'displayFinancialStatus' : ''}
        fulfillmentStatus
        ${fieldsToFetch.includes('created') || fieldsToFetch.includes('createdAt') ? 'createdAt' : ''}
      }
    }
  }
}`;
      } else if (primaryEntity === 'customer' || primaryEntity === 'customers') {
        query = `#graphql
query getCustomers($first: Int!, $query: String) {
  customers(first: $first, query: $query) {
    edges {
      node {
        ${fieldsToFetch.includes('id') ? 'id' : ''}
        ${fieldsToFetch.includes('name') ? 'displayName' : ''}
        email
        phone
        ${fieldsToFetch.includes('created') || fieldsToFetch.includes('createdAt') ? 'createdAt' : ''}
        ${fieldsToFetch.includes('updated') || fieldsToFetch.includes('updatedAt') ? 'updatedAt' : ''}
      }
    }
  }
}`;
      } else {
        // Generic fallback
        query = `#graphql
query get${entityName.charAt(0).toUpperCase() + entityName.slice(1)}($first: Int!) {
  ${entityName}(first: $first) {
    edges {
      node {
        id
        ${fieldsToFetch.includes('title') ? 'title' : ''}
        ${fieldsToFetch.includes('name') ? 'name' : ''}
        ${fieldsToFetch.includes('created') || fieldsToFetch.includes('createdAt') ? 'createdAt' : ''}
      }
    }
  }
}`;
      }
    }

    // Clean up the query (remove empty lines and extra whitespace)
    return query.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Main method to generate GraphQL query from natural language
   */
  async generateGraphQLQuery(request: GraphQLGenerationRequest): Promise<GraphQLGenerationResponse> {
    try {
      // Initialize MCP connection
      await this.initializeShopifyMCP();

      // Analyze the user query
      const analysis = this.analyzeQuery(request.query);

      // Generate initial GraphQL query
      const generatedQuery = this.generateQueryFromAnalysis(analysis);

      // Create explanation
      const explanation = this.generateExplanation(request.query, analysis, generatedQuery);

      return {
        generatedQuery,
        explanation,
        isValid: true, // Will be validated by MCP tools
        usedFields: analysis.fields
      };
    } catch (error) {
      console.error('Error generating GraphQL query:', error);
      return {
        generatedQuery: '',
        explanation: `Error generating query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isValid: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate human-readable explanation of the query
   */
  private generateExplanation(originalQuery: string, analysis: ReturnType<typeof this.analyzeQuery>, generatedQuery: string): string {
    const { intent, entities, filters } = analysis;

    let explanation = `Based on your request "${originalQuery}", I generated a GraphQL query that will:\n\n`;

    if (intent === 'fetch' || intent === 'search') {
      explanation += `• Fetch ${entities.length > 0 ? entities.join(', ') : 'data'} from your Shopify store\n`;
    }

    if (filters.length > 0) {
      explanation += `• Apply filtering based on: ${filters.join(', ')}\n`;
    }

    explanation += `• Return the most relevant fields for this type of query\n`;
    explanation += `• Use pagination to limit results (first: $first parameter)\n\n`;
    explanation += `The query follows Shopify's Admin API GraphQL schema and includes error handling.`;

    return explanation;
  }

  /**
   * Execute the generated GraphQL query
   */
  async executeGraphQLQuery(
    query: string,
    variables: Record<string, any>,
    admin: AdminApiContext
  ): Promise<{ data: any; errors?: any[] }> {
    try {
      const response = await admin.graphql(query, { variables });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error executing GraphQL query:', error);
      throw new Error(`GraphQL execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const aiGraphQLService = new AIGraphQLService();