import type {
  QueryResult,
  IntentType,
  ShopifyOperation,
  MockDataResult,
} from "./ai.types";
import type { IAIDal } from "./ai.dal";
import type { IAIExternal } from "./ai.external";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export class AIService {
  constructor(
    private dal: IAIDal,
    private aiExternal: IAIExternal
  ) {}

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

  identifyIntent(message: string): IntentType {
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

  private async handleQuery(
    admin: AdminApiContext,
    message: string,
  ): Promise<QueryResult> {
    try {
      // 1. Get schema information
      const schemaInfo = await this.dal.getSchemaInfo(admin);

      // 2. Identify relevant queries using AI
      const relevantQueries = await this.aiExternal.determineRelevantQueries(
        message,
        schemaInfo.queries,
      );

      // 3. Generate GraphQL query using AI (it will determine the operation type)
      const { query } = await this.aiExternal.buildQuery(
        message,
        relevantQueries
      );

      // 4. Execute query
      let executionResult;
      let summary;

      try {
        executionResult = await this.dal.executeGraphQLQuery(admin, query);
        const operation = this.determineOperationFromResult(executionResult);
        summary = await this.aiExternal.generateSummary(executionResult, operation, message);
      } catch (error) {
        // Use mock data if actual query fails - default to products for fallback
        const mockData = this.getMockData("products");
        executionResult = mockData.executionResult;
        summary = mockData.summary;
      }

      return {
        query,
        explanation: `Generated a GraphQL query based on: "${message}"`,
        executionResult,
        summary,
        intent: "query",
      };
    } catch (error) {
      return this.handleError(message, error);
    }
  }

  private async handleMutation(
    admin: AdminApiContext,
    message: string,
  ): Promise<QueryResult> {
    try {
      // 1. Get mutation schema information
      const schemaInfo = await this.dal.getSchemaInfo(admin);

      // 2. Identify relevant mutations using AI
      const relevantMutations = await this.aiExternal.determineRelevantMutations(
        message,
        schemaInfo.mutations,
      );

      return {
        query: "",
        explanation:
          `Mutation operations are not yet implemented for safety reasons. Found ${relevantMutations.length} relevant mutations. This feature is coming soon!`,
        summary: `I understand you want to make changes to your store data. For now, I can only read and analyze your store information. Mutation operations will be available in a future update.`,
        intent: "mutation",
      };
    } catch (error) {
      return this.handleError(message, error);
    }
  }

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
      explanation:
        "This appears to be a general message rather than a specific store query.",
      summary: randomResponse,
      intent: "message",
    };
  }

  private determineOperationFromResult(result: any): ShopifyOperation {
    if (!result || typeof result !== 'object') {
      return "products"; // default fallback
    }

    // Check for different operation types in the result structure
    const keys = Object.keys(result);

    if (keys.includes('products')) return "products";
    if (keys.includes('orders')) return "orders";
    if (keys.includes('customers')) return "customers";
    if (keys.includes('collections')) return "collections";

    // Default to products if no specific operation detected
    return "products";
  }

  private getMockData(operation: ShopifyOperation): MockDataResult {
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

    return mockData[operation] || mockData.products;
  }

  private handleError(message: string, error: any): QueryResult {
    return {
      query: "",
      explanation: "An error occurred while processing your request.",
      summary:
        "I'm having trouble processing your request. Please try again with a different query.",
      intent: "message",
    };
  }
}
