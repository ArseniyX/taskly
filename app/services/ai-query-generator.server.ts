
export interface QueryResult {
  query: string;
  variables: Record<string, any>;
  explanation: string;
  executionResult?: any;
  summary: string;
}

export class AIQueryGeneratorService {
  /**
   * Generate mock GraphQL query and results for UI testing
   */
  async generateGraphQLQuery(
    _admin: any,
    userQuery: string,
  ): Promise<QueryResult> {
    console.log(`Processing query: "${userQuery}"`);

    // Simple query analysis
    const operation = this.analyzeOperation(userQuery);
    const mockData = this.getMockData(operation);

    // Mock GraphQL query
    const query = this.buildMockQuery(operation);
    const variables = { first: 10 };

    // Mock execution with delay to simulate API call
    await this.delay(500);

    return {
      query,
      variables,
      explanation: `Generated a query to fetch ${operation} from your store`,
      executionResult: mockData.executionResult,
      summary: mockData.summary,
    };
  }

  private analyzeOperation(userQuery: string): string {
    const query = userQuery.toLowerCase();

    if (query.includes('order')) return 'orders';
    if (query.includes('customer')) return 'customers';
    if (query.includes('collection')) return 'collections';

    return 'products'; // default
  }

  private buildMockQuery(operation: string): string {
    const fields = this.getFields(operation);

    return `#graphql
query get${operation.charAt(0).toUpperCase() + operation.slice(1)}($first: Int!) {
  ${operation}(first: $first) {
    edges {
      node {
        ${fields.join('\n        ')}
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}`;
  }

  private getFields(operation: string): string[] {
    const fieldMap = {
      products: ['id', 'title', 'status', 'totalInventory', 'vendor', 'createdAt'],
      orders: ['id', 'name', 'displayFinancialStatus', 'fulfillmentStatus', 'createdAt'],
      customers: ['id', 'displayName', 'email', 'phone', 'createdAt'],
      collections: ['id', 'title', 'handle', 'description', 'createdAt'],
    };

    return fieldMap[operation as keyof typeof fieldMap] || fieldMap.products;
  }

  private getMockData(operation: string) {
    const mockData = {
      products: {
        executionResult: {
          products: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Product/1',
                  title: 'Awesome T-Shirt',
                  status: 'ACTIVE',
                  totalInventory: 50,
                  vendor: 'Cool Brand',
                  createdAt: '2024-01-15T10:00:00Z'
                }
              },
              {
                node: {
                  id: 'gid://shopify/Product/2',
                  title: 'Super Sneakers',
                  status: 'ACTIVE',
                  totalInventory: 25,
                  vendor: 'Shoe Co',
                  createdAt: '2024-01-20T15:30:00Z'
                }
              },
              {
                node: {
                  id: 'gid://shopify/Product/3',
                  title: 'Classic Jeans',
                  status: 'DRAFT',
                  totalInventory: 0,
                  vendor: 'Denim Inc',
                  createdAt: '2024-02-01T09:15:00Z'
                }
              }
            ]
          }
        },
        summary: "You have **3 products** in your store. Most items have good inventory levels, with **2 active products** and **1 draft** that needs attention."
      },

      orders: {
        executionResult: {
          orders: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Order/1001',
                  name: '#1001',
                  displayFinancialStatus: 'PAID',
                  fulfillmentStatus: 'FULFILLED',
                  createdAt: '2024-12-01T14:30:00Z'
                }
              },
              {
                node: {
                  id: 'gid://shopify/Order/1002',
                  name: '#1002',
                  displayFinancialStatus: 'PENDING',
                  fulfillmentStatus: 'UNFULFILLED',
                  createdAt: '2024-12-02T09:20:00Z'
                }
              }
            ]
          }
        },
        summary: "You have **2 recent orders**. **1 order** is fully processed and **1 order** is pending fulfillment."
      },

      customers: {
        executionResult: {
          customers: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Customer/501',
                  displayName: 'John Smith',
                  email: 'john@example.com',
                  phone: '+1-555-0123',
                  createdAt: '2024-11-15T12:00:00Z'
                }
              }
            ]
          }
        },
        summary: "You have **1 customer** in your database. Your customer base is growing steadily."
      },

      collections: {
        executionResult: {
          collections: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Collection/301',
                  title: 'Summer Collection',
                  handle: 'summer-collection',
                  description: 'Hot summer styles',
                  createdAt: '2024-05-01T08:00:00Z'
                }
              }
            ]
          }
        },
        summary: "You have **1 collection** organizing your products. Collections help customers find what they're looking for."
      }
    };

    return mockData[operation as keyof typeof mockData] || mockData.products;
  }

  identifyIntent(message: string): "query" | "mutation" | "message" {
    const lowerMessage = message.toLowerCase();

    // Query keywords - user wants to fetch/see data
    const queryKeywords = [
      "show", "list", "get", "find", "search", "display", "view", "see",
      "what", "how many", "count", "total", "sum", "average",
      "products", "orders", "customers", "collections", "inventory"
    ];

    // Mutation keywords - user wants to change data
    const mutationKeywords = [
      "create", "add", "make", "new", "build",
      "update", "change", "edit", "modify", "set",
      "delete", "remove", "cancel", "archive"
    ];

    // Check for mutation intent first (more specific)
    if (mutationKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "mutation";
    }

    // Check for query intent
    if (queryKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "query";
    }

    // Default to message for general conversation
    return "message";
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiQueryGenerator = new AIQueryGeneratorService();