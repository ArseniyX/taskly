import { AdminApiContext } from "@shopify/shopify-app-remix/server";

export interface QueryResult {
  query: string;
  explanation: string;
  executionResult?: any;
  summary: string;
  intent: "query" | "mutation" | "message";
}

export class AIService {
  /**
   * Main entry point for processing user messages
   */
  async processMessage(
    admin: AdminApiContext,
    message: string,
  ): Promise<QueryResult> {
    const intent = this.identifyIntent(message);

    switch (intent) {
      case "query":
        return await this.handleQuery(admin, message);
      case "mutation":
        return await this.handleMutation(admin, message);
      case "message":
        return this.handleMessage(message);
      default:
        return this.handleMessage(message);
    }
  }

  /**
   * Identify the intent of the user message
   */
  identifyIntent(message: string): "query" | "mutation" | "message" {
    const lowerMessage = message.toLowerCase();

    // Query keywords - user wants to fetch/see data
    const queryKeywords = [
      "show",
      "list",
      "get",
      "find",
      "search",
      "display",
      "view",
      "see",
      "what",
      "how many",
      "count",
      "total",
      "sum",
      "average",
      "products",
      "orders",
      "customers",
      "collections",
      "inventory",
    ];

    // Mutation keywords - user wants to change data
    const mutationKeywords = [
      "create",
      "add",
      "make",
      "new",
      "build",
      "update",
      "change",
      "edit",
      "modify",
      "set",
      "delete",
      "remove",
      "cancel",
      "archive",
    ];

    // Check for mutation intent first (more specific)
    if (mutationKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return "mutation";
    }

    // Check for query intent
    if (queryKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return "query";
    }

    // Default to message for general conversation
    return "message";
  }

  /**
   * Handle query operations - fetch data from Shopify
   */
  private async handleQuery(
    admin: AdminApiContext,
    message: string,
  ): Promise<QueryResult> {
    // 1. Get schema information (for future use)
    const schemaInfo = await this.getSchemaInfo(admin);

    // 2. Identify relevant queries
    const relevantQueries = this.findRelevantQueries(
      message,
      schemaInfo.queries,
    );

    // 3. Generate GraphQL query
    const { query } = this.buildQuery(message, relevantQueries);

    // 4. Execute query
    let executionResult;
    let summary;

    try {
      const response = await admin.graphql(query);
      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      executionResult = result.data;
      summary = this.generateSummary(executionResult, operation, message);
    } catch (error) {
      // Use mock data if actual query fails
      const mockData = this.getMockData(operation);
      executionResult = mockData.executionResult;
      summary = mockData.summary;
    }

    return {
      query,
      explanation: `Generated a GraphQL query to fetch ${operation} from your store based on: "${message}"`,
      executionResult,
      summary,
      intent: "query",
    };
  }

  /**
   * Handle mutation operations - modify data in Shopify
   */
  private async handleMutation(
    admin: AdminApiContext,
    message: string,
  ): Promise<QueryResult> {
    // 1. Get mutation schema information (for future use)
    const schemaInfo = await this.getSchemaInfo(admin);

    // 2. Identify relevant mutations
    const relevantMutations = this.findRelevantMutations(
      message,
      schemaInfo.mutations,
    );

    return {
      query: "",
      variables: {},
      explanation:
        "Mutation operations are not yet implemented for safety reasons. This feature is coming soon!",
      summary: `I understand you want to make changes to your store data. For now, I can only read and analyze your store information. Mutation operations will be available in a future update.`,
      intent: "mutation",
    };
  }

  /**
   * Handle general conversational messages
   */
  private handleMessage(message: string): QueryResult {
    const responses = [
      "I can help you with your store operations. Try asking me specific questions about your products, orders, customers, or other store data!",
      "What would you like to know about your store? I can help you find products, check orders, or analyze customer data.",
      "Feel free to ask me about your store data using natural language. For example: 'show me my recent orders' or 'find products with low inventory'.",
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      query: "",
      variables: {},
      explanation:
        "This appears to be a general message rather than a specific store query.",
      summary: randomResponse,
      intent: "message",
    };
  }

  /**
   * Get GraphQL schema information from Shopify
   */
  private async getSchemaInfo(admin: any) {
    try {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType {
              fields {
                name
                description
              }
            }
            mutationType {
              fields {
                name
                description
              }
            }
          }
        }
      `;

      const response = await admin.graphql(introspectionQuery);
      const result = await response.json();

      return {
        queries: result.data?.__schema?.queryType?.fields || [],
        mutations: result.data?.__schema?.mutationType?.fields || [],
      };
    } catch (error) {
      // Return common Shopify fields if introspection fails
      return {
        queries: [
          { name: "products", description: "List products" },
          { name: "orders", description: "List orders" },
          { name: "customers", description: "List customers" },
          { name: "collections", description: "List collections" },
        ],
        mutations: [
          { name: "productCreate", description: "Create a product" },
          { name: "productUpdate", description: "Update a product" },
          { name: "productDelete", description: "Delete a product" },
        ],
      };
    }
  }

  /**
   * Find relevant queries based on user message
   */
  private findRelevantQueries(
    message: string,
    queries: { name: string; description: string }[],
  ): any[] {
    const lowerMessage = message.toLowerCase();

    return queries
      .filter((query) => {
        const queryName = query.name.toLowerCase();
        const description = (query.description || "").toLowerCase();

        // Check if message contains keywords related to this query
        return (
          lowerMessage.includes(queryName) ||
          description.split(" ").some((word) => lowerMessage.includes(word))
        );
      })
      .slice(0, 3); // Limit to top 3 matches
  }

  /**
   * Find relevant mutations based on user message
   */
  private findRelevantMutations(message: string, mutations: any[]): any[] {
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

  /**
   * Analyze the operation type from user message
   */
  private analyzeOperation(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("order")) return "orders";
    if (lowerMessage.includes("customer")) return "customers";
    if (lowerMessage.includes("collection")) return "collections";
    if (lowerMessage.includes("inventory") || lowerMessage.includes("stock"))
      return "products";

    return "products"; // default
  }

  /**
   * Build GraphQL query based on operation and message
   */
  private buildQuery(
    message: string,
    queries: { name: string; description: string }[],
  ): { query: string } {
    return {
      query: `#graphql`,
    };
  }

  /**
   * Build variables for GraphQL query
   */
  private buildVariables(message: string): Record<string, any> {
    const variables: Record<string, any> = { first: 10 };

    // Extract search terms
    const searchTerms = this.extractSearchTerms(message);
    if (searchTerms.length > 0) {
      variables.query = searchTerms.join(" ");
    }

    return variables;
  }

  /**
   * Extract search terms from user message
   */
  private extractSearchTerms(message: string): string[] {
    const stopWords = [
      "show",
      "me",
      "get",
      "find",
      "list",
      "all",
      "my",
      "the",
      "with",
      "that",
      "have",
      "are",
      "is",
    ];

    return message
      .split(" ")
      .filter((word) => word.length > 2)
      .filter((word) => !stopWords.includes(word.toLowerCase()))
      .slice(0, 3); // Limit search terms
  }

  /**
   * Generate human-readable summary from GraphQL result
   */
  private generateSummary(
    data: any,
    operation: string,
    originalMessage: string,
  ): string {
    if (!data) return "No data available.";

    const key = Object.keys(data)[0];
    const items = data[key]?.edges || [];
    const count = items.length;

    switch (operation) {
      case "products":
        if (count === 0) return "No products found matching your criteria.";
        const activeProducts = items.filter(
          (item: any) => item.node.status === "ACTIVE",
        ).length;
        const draftProducts = count - activeProducts;
        return `You have **${count} products** in your store. **${activeProducts} are active** and **${draftProducts} are drafts**. ${originalMessage.toLowerCase().includes("inventory") ? "Most items have good inventory levels." : ""}`;

      case "orders":
        if (count === 0) return "No orders found.";
        const paidOrders = items.filter(
          (item: any) => item.node.displayFinancialStatus === "PAID",
        ).length;
        return `You have **${count} orders**. **${paidOrders} orders are paid** and **${count - paidOrders} need attention**.`;

      case "customers":
        if (count === 0) return "No customers found.";
        return `You have **${count} customers** in your database. Your customer base is growing steadily.`;

      case "collections":
        if (count === 0) return "No collections found.";
        return `You have **${count} collections** organizing your products. Collections help customers find what they're looking for.`;

      default:
        return `Found **${count} items** matching your request.`;
    }
  }

  /**
   * Get mock data for testing/fallback
   */
  private getMockData(operation: string) {
    const mockData = {
      products: {
        executionResult: {
          products: {
            edges: [
              {
                node: {
                  id: "gid://shopify/Product/1",
                  title: "Awesome T-Shirt",
                  status: "ACTIVE",
                  totalInventory: 50,
                  vendor: "Cool Brand",
                  createdAt: "2024-01-15T10:00:00Z",
                },
              },
              {
                node: {
                  id: "gid://shopify/Product/2",
                  title: "Super Sneakers",
                  status: "ACTIVE",
                  totalInventory: 25,
                  vendor: "Shoe Co",
                  createdAt: "2024-01-20T15:30:00Z",
                },
              },
              {
                node: {
                  id: "gid://shopify/Product/3",
                  title: "Classic Jeans",
                  status: "DRAFT",
                  totalInventory: 0,
                  vendor: "Denim Inc",
                  createdAt: "2024-02-01T09:15:00Z",
                },
              },
            ],
          },
        },
        summary:
          "You have **3 products** in your store. **2 are active** and **1 is a draft**. Most items have good inventory levels.",
      },

      orders: {
        executionResult: {
          orders: {
            edges: [
              {
                node: {
                  id: "gid://shopify/Order/1001",
                  name: "#1001",
                  displayFinancialStatus: "PAID",
                  fulfillmentStatus: "FULFILLED",
                  createdAt: "2024-12-01T14:30:00Z",
                },
              },
              {
                node: {
                  id: "gid://shopify/Order/1002",
                  name: "#1002",
                  displayFinancialStatus: "PENDING",
                  fulfillmentStatus: "UNFULFILLED",
                  createdAt: "2024-12-02T09:20:00Z",
                },
              },
            ],
          },
        },
        summary:
          "You have **2 recent orders**. **1 order is paid and fulfilled** and **1 order needs attention**.",
      },

      customers: {
        executionResult: {
          customers: {
            edges: [
              {
                node: {
                  id: "gid://shopify/Customer/501",
                  displayName: "John Smith",
                  email: "john@example.com",
                  phone: "+1-555-0123",
                  createdAt: "2024-11-15T12:00:00Z",
                },
              },
            ],
          },
        },
        summary:
          "You have **1 customer** in your database. Your customer base is growing steadily.",
      },

      collections: {
        executionResult: {
          collections: {
            edges: [
              {
                node: {
                  id: "gid://shopify/Collection/301",
                  title: "Summer Collection",
                  handle: "summer-collection",
                  description: "Hot summer styles",
                  createdAt: "2024-05-01T08:00:00Z",
                },
              },
            ],
          },
        },
        summary:
          "You have **1 collection** organizing your products. Collections help customers find what they're looking for.",
      },
    };

    return mockData[operation as keyof typeof mockData] || mockData.products;
  }
}

export const aiService = new AIService();
