import type { ShopifyOperation } from "./ai.types";

// Dynamically import AI SDK to avoid issues in test environment
let generateText: any;
let openai: any;

const initializeAI = async () => {
  if (!generateText) {
    try {
      const aiModule = await import("ai");
      const openaiModule = await import("@ai-sdk/openai");
      generateText = aiModule.generateText;
      openai = openaiModule.openai;
    } catch (error) {
      // AI SDK not available (likely in test environment)
      console.warn("AI SDK not available, using fallback implementations");
    }
  }
};

export interface IAIExternal {
  buildQuery(
    message: string,
    relevantQueries: { name: string; description: string }[]
  ): Promise<{ query: string; variables?: Record<string, any> }>;

  buildMutation(
    message: string,
    relevantMutations: { name: string; description: string }[]
  ): Promise<{ query: string; variables?: Record<string, any> }>;

  determineRelevantQueries(
    message: string,
    queries: { name: string; description: string }[]
  ): Promise<{ name: string; description: string }[]>;

  determineRelevantMutations(
    message: string,
    mutations: { name: string; description: string }[]
  ): Promise<{ name: string; description: string }[]>;

  generateSummary(
    data: any,
    operation: ShopifyOperation,
    originalMessage: string
  ): Promise<string>;
}

export class AIExternal implements IAIExternal {
  private model: any;

  constructor() {
    // Initialize AI SDK asynchronously
    initializeAI().then(() => {
      if (openai) {
        this.model = openai("gpt-4o-mini");
      }
    });
  }

  async buildQuery(
    message: string,
    relevantQueries: { name: string; description: string }[]
  ): Promise<{ query: string; variables?: Record<string, any> }> {
    try {
      if (!generateText || !this.model) {
        throw new Error("AI SDK not available");
      }

      const { text } = await generateText({
        model: this.model,
        prompt: `
You are a GraphQL expert for Shopify Admin API. Generate a GraphQL query based on the user's request.

User message: "${message}"
Available queries: ${JSON.stringify(relevantQueries, null, 2)}

Analyze the user message to determine what they want (products, orders, customers, collections, etc.) and generate an appropriate GraphQL query. Include:
1. Proper GraphQL syntax with #graphql comment
2. Appropriate fields for the detected operation type
3. Pagination with first: 10
4. Standard Shopify edge/node structure
5. Common fields like id, title/name, status, createdAt

Respond with valid GraphQL only, no explanations.
        `,
      });

      return {
        query: text.trim(),
        variables: { first: 10 },
      };
    } catch (error) {
      // Fallback to simple query structure - determine operation from relevant queries
      const operation = this.determineOperationFromQueries(relevantQueries, message);
      return {
        query: `#graphql
          query Get${operation.charAt(0).toUpperCase() + operation.slice(1)} {
            ${operation}(first: 10) {
              edges {
                node {
                  id
                  ... on Product {
                    title
                    status
                    totalInventory
                  }
                  ... on Order {
                    name
                    displayFinancialStatus
                    fulfillmentStatus
                  }
                  ... on Customer {
                    displayName
                    email
                  }
                  ... on Collection {
                    title
                    handle
                  }
                  createdAt
                }
              }
            }
          }
        `,
        variables: { first: 10 },
      };
    }
  }

  async buildMutation(
    message: string,
    relevantMutations: { name: string; description: string }[]
  ): Promise<{ query: string; variables?: Record<string, any> }> {
    try {
      if (!generateText || !this.model) {
        throw new Error("AI SDK not available");
      }

      const { text } = await generateText({
        model: this.model,
        prompt: `
You are a GraphQL expert for Shopify Admin API. Generate a GraphQL mutation based on the user's request.

User message: "${message}"
Available mutations: ${JSON.stringify(relevantMutations, null, 2)}

Generate a GraphQL mutation with:
1. Proper GraphQL syntax with #graphql comment
2. Appropriate input variables
3. Standard Shopify mutation response structure with userErrors

Respond with valid GraphQL only, no explanations.
        `,
      });

      return {
        query: text.trim(),
        variables: {},
      };
    } catch (error) {
      // Return empty mutation as fallback
      return {
        query: `#graphql
          # Mutation not implemented for safety
        `,
        variables: {},
      };
    }
  }

  async determineRelevantQueries(
    message: string,
    queries: { name: string; description: string }[]
  ): Promise<{ name: string; description: string }[]> {
    try {
      if (!generateText || !this.model) {
        throw new Error("AI SDK not available");
      }

      const { text } = await generateText({
        model: this.model,
        prompt: `
Analyze this user message and determine the most relevant Shopify GraphQL queries.

User message: "${message}"
Available queries: ${JSON.stringify(queries.slice(0, 20), null, 2)}

Return the top 3 most relevant queries as JSON array. Consider:
- Keywords in the message
- Intent of the user
- Semantic similarity between message and query descriptions

Respond with JSON only: [{"name": "queryName", "description": "description"}, ...]
        `,
      });

      const parsed = JSON.parse(text.trim());
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (error) {
      // Fallback to keyword matching
      return this.keywordBasedQueryMatching(message, queries);
    }
  }

  async determineRelevantMutations(
    message: string,
    mutations: { name: string; description: string }[]
  ): Promise<{ name: string; description: string }[]> {
    try {
      if (!generateText || !this.model) {
        throw new Error("AI SDK not available");
      }

      const { text } = await generateText({
        model: this.model,
        prompt: `
Analyze this user message and determine the most relevant Shopify GraphQL mutations.

User message: "${message}"
Available mutations: ${JSON.stringify(mutations.slice(0, 20), null, 2)}

Return the top 3 most relevant mutations as JSON array. Consider:
- Action keywords (create, update, delete, etc.)
- Target entities (product, order, customer, etc.)
- Semantic similarity

Respond with JSON only: [{"name": "mutationName", "description": "description"}, ...]
        `,
      });

      const parsed = JSON.parse(text.trim());
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (error) {
      // Fallback to keyword matching
      return this.keywordBasedMutationMatching(message, mutations);
    }
  }

  async generateSummary(
    data: any,
    operation: ShopifyOperation,
    originalMessage: string
  ): Promise<string> {
    try {
      if (!generateText || !this.model) {
        throw new Error("AI SDK not available");
      }

      const { text } = await generateText({
        model: this.model,
        prompt: `
Generate a friendly, informative summary of this Shopify data for a store owner.

Operation: ${operation}
User's original request: "${originalMessage}"
Data: ${JSON.stringify(data, null, 2)}

Create a summary that:
1. Uses markdown formatting for emphasis (**bold**)
2. Mentions specific counts and key metrics
3. Provides actionable insights when relevant
4. Is conversational and helpful
5. Highlights important status information

Keep it concise (1-3 sentences) but informative.
        `,
      });

      return text.trim();
    } catch (error) {
      // Fallback to basic summary generation
      return this.generateBasicSummary(data, operation, originalMessage);
    }
  }

  private keywordBasedQueryMatching(
    message: string,
    queries: { name: string; description: string }[]
  ): { name: string; description: string }[] {
    const lowerMessage = message.toLowerCase();

    return queries
      .filter((query) => {
        const queryName = query.name.toLowerCase();
        const description = (query.description || "").toLowerCase();

        return (
          lowerMessage.includes(queryName) ||
          description.split(" ").some((word) => lowerMessage.includes(word))
        );
      })
      .slice(0, 3);
  }

  private keywordBasedMutationMatching(
    message: string,
    mutations: { name: string; description: string }[]
  ): { name: string; description: string }[] {
    const lowerMessage = message.toLowerCase();

    return mutations
      .filter((mutation) => {
        const mutationName = mutation.name.toLowerCase();
        const description = (mutation.description || "").toLowerCase();

        return (
          lowerMessage.includes(mutationName) ||
          description.split(" ").some((word) => lowerMessage.includes(word))
        );
      })
      .slice(0, 3);
  }

  private generateBasicSummary(
    data: any,
    operation: ShopifyOperation,
    originalMessage: string
  ): string {
    if (!data) return "No data available.";

    const key = Object.keys(data)[0];
    const items = data[key]?.edges || [];
    const count = items.length;

    switch (operation) {
      case "products":
        if (count === 0) return "No products found matching your criteria.";
        const activeProducts = items.filter(
          (item: any) => item.node.status === "ACTIVE"
        ).length;
        const draftProducts = count - activeProducts;
        return `You have **${count} products** in your store. **${activeProducts} are active** and **${draftProducts} are drafts**.`;

      case "orders":
        if (count === 0) return "No orders found.";
        const paidOrders = items.filter(
          (item: any) => item.node.displayFinancialStatus === "PAID"
        ).length;
        return `You have **${count} orders**. **${paidOrders} orders are paid** and **${count - paidOrders} need attention**.`;

      case "customers":
        if (count === 0) return "No customers found.";
        return `You have **${count} customers** in your database. Your customer base is growing steadily.`;

      case "collections":
        if (count === 0) return "No collections found.";
        return `You have **${count} collections** organizing your products.`;

      default:
        return `Found **${count} items** matching your request.`;
    }
  }
}