import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { SchemaInfo } from "./ai.types";

export interface IAIDal {
  executeGraphQLQuery(admin: AdminApiContext, query: string): Promise<any>;
  getSchemaInfo(admin: AdminApiContext): Promise<SchemaInfo>;
  findQueriesByNames(names: string[], admin: AdminApiContext): Promise<any[]>;
  findMutationsByNames(names: string[], admin: AdminApiContext): Promise<any[]>;
}

export class AIDal implements IAIDal {
  async executeGraphQLQuery(
    admin: AdminApiContext,
    query: string,
  ): Promise<any> {
    try {
      const response = await admin.graphql(query);
      const result = (await response.json()) as any;

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async findQueriesByNames(
    names: string[],
    admin: AdminApiContext,
  ): Promise<any[]> {
    try {
      // Get detailed schema information for specific queries
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType {
              fields {
                name
                description
                args {
                  name
                  description
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
                type {
                  name
                  kind
                  fields {
                    name
                    type {
                      name
                      kind
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await admin.graphql(introspectionQuery);
      const result = (await response.json()) as any;

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const allFields = result.data?.__schema?.queryType?.fields || [];

      // Filter to only the requested query names
      return allFields.filter((field: any) => names.includes(field.name));
    } catch (error) {
      // Fallback: return basic query structure for requested names
      return names.map((name) => ({
        name,
        description: `${name} query`,
        args: [],
        type: { name: "Connection", kind: "OBJECT" },
      }));
    }
  }

  async findMutationsByNames(
    names: string[],
    admin: AdminApiContext,
  ): Promise<any[]> {
    try {
      // Get detailed schema information for specific mutations
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            mutationType {
              fields {
                name
                description
                args {
                  name
                  description
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
                type {
                  name
                  kind
                  fields {
                    name
                    type {
                      name
                      kind
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await admin.graphql(introspectionQuery);
      const result = (await response.json()) as any;

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const allFields = result.data?.__schema?.mutationType?.fields || [];

      // Filter to only the requested mutation names
      return allFields.filter((field: any) => names.includes(field.name));
    } catch (error) {
      // Fallback: return basic mutation structure for requested names
      return names.map((name) => ({
        name,
        description: `${name} mutation`,
        args: [],
        type: { name: "Payload", kind: "OBJECT" },
      }));
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
