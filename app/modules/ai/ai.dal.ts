import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { SchemaInfo } from "./ai.types";

export interface IAIDal {
  executeGraphQLQuery(admin: AdminApiContext, query: string): Promise<any>;
  getSchemaInfo(admin: AdminApiContext): Promise<SchemaInfo>;
}

export class AIDal implements IAIDal {
  async executeGraphQLQuery(admin: AdminApiContext, query: string): Promise<any> {
    try {
      const response = await admin.graphql(query);
      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getSchemaInfo(admin: AdminApiContext): Promise<SchemaInfo> {
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
}