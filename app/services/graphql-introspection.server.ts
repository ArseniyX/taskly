import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export interface GraphQLField {
  name: string;
  type: string;
  description?: string;
  args?: GraphQLField[];
}

export interface GraphQLType {
  name: string;
  kind: string;
  fields?: GraphQLField[];
  description?: string;
}

export interface GraphQLSchema {
  types: GraphQLType[];
  queryType: GraphQLType;
}

/**
 * Simple GraphQL schema introspection service
 * Much simpler than MCP - uses your existing Shopify Admin API connection
 */
export class GraphQLIntrospectionService {
  private schemaCache: Map<string, GraphQLSchema> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  /**
   * Get GraphQL schema through direct introspection
   */
  async getSchema(admin: AdminApiContext, cacheKey = 'shopify_admin'): Promise<GraphQLSchema> {
    // Check cache first
    const cached = this.schemaCache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            types {
              name
              kind
              description
              fields(includeDeprecated: false) {
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
              }
            }
          }
        }
      `;

      const response = await admin.graphql(introspectionQuery);
      const result = await response.json();

      if (result.errors) {
        throw new Error(`Introspection failed: ${result.errors[0].message}`);
      }

      const schema = this.parseIntrospectionResult(result.data);

      // Cache the result
      this.schemaCache.set(cacheKey, schema);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return schema;
    } catch (error) {
      console.error('Schema introspection failed:', error);
      throw error;
    }
  }

  /**
   * Find fields for a specific type (e.g., "Product", "Order")
   */
  async getTypeFields(admin: AdminApiContext, typeName: string): Promise<GraphQLField[]> {
    const schema = await this.getSchema(admin);
    const type = schema.types.find(t => t.name === typeName);
    return type?.fields || [];
  }

  /**
   * Find available queries (products, orders, customers, etc.)
   */
  async getAvailableQueries(admin: AdminApiContext): Promise<GraphQLField[]> {
    const schema = await this.getSchema(admin);
    return schema.queryType.fields || [];
  }

  /**
   * Generate optimal field selection for a type based on user query
   */
  async generateFieldSelection(
    admin: AdminApiContext,
    typeName: string,
    userQuery: string
  ): Promise<string[]> {
    const fields = await this.getTypeFields(admin, typeName);
    const queryLower = userQuery.toLowerCase();

    // Always include essential fields
    const essentialFields = ['id'];

    // Add fields based on user query intent
    const selectedFields = fields.filter(field => {
      const fieldName = field.name.toLowerCase();

      // Essential fields
      if (essentialFields.includes(fieldName)) return true;

      // Common display fields
      if (['title', 'name', 'displayname'].includes(fieldName)) return true;

      // Time fields if asking about recent/old data
      if ((queryLower.includes('recent') || queryLower.includes('created') || queryLower.includes('updated'))
          && ['createdat', 'updatedat'].includes(fieldName)) return true;

      // Status/state fields
      if ((queryLower.includes('status') || queryLower.includes('active') || queryLower.includes('published'))
          && fieldName.includes('status')) return true;

      // Price/money fields
      if ((queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('total'))
          && (fieldName.includes('price') || fieldName.includes('cost') || fieldName.includes('total'))) return true;

      // Inventory fields
      if ((queryLower.includes('inventory') || queryLower.includes('stock') || queryLower.includes('quantity'))
          && (fieldName.includes('inventory') || fieldName.includes('quantity'))) return true;

      // Contact fields
      if ((queryLower.includes('email') || queryLower.includes('phone') || queryLower.includes('contact'))
          && (fieldName.includes('email') || fieldName.includes('phone'))) return true;

      return false;
    }).map(field => field.name);

    // Remove duplicates and limit to reasonable number
    return [...new Set(selectedFields)].slice(0, 8);
  }

  /**
   * Generate a complete GraphQL query for common Shopify operations
   */
  async generateQuery(
    admin: AdminApiContext,
    operation: 'products' | 'orders' | 'customers' | 'collections',
    userQuery: string,
    limit = 10
  ): Promise<string> {
    const operationMap = {
      products: 'Product',
      orders: 'Order',
      customers: 'Customer',
      collections: 'Collection'
    };

    const typeName = operationMap[operation];
    const fields = await this.generateFieldSelection(admin, typeName, userQuery);

    // Generate query based on operation type
    switch (operation) {
      case 'products':
        return this.generateProductQuery(fields, userQuery, limit);
      case 'orders':
        return this.generateOrderQuery(fields, userQuery, limit);
      case 'customers':
        return this.generateCustomerQuery(fields, userQuery, limit);
      case 'collections':
        return this.generateCollectionQuery(fields, userQuery, limit);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private parseIntrospectionResult(data: any): GraphQLSchema {
    const types = data.__schema.types.map((type: any) => ({
      name: type.name,
      kind: type.kind,
      description: type.description,
      fields: type.fields?.map((field: any) => ({
        name: field.name,
        type: this.getTypeString(field.type),
        description: field.description,
        args: field.args?.map((arg: any) => ({
          name: arg.name,
          type: this.getTypeString(arg.type),
        }))
      }))
    }));

    const queryType = types.find((t: GraphQLType) => t.name === data.__schema.queryType.name);

    return { types, queryType };
  }

  private getTypeString(type: any): string {
    if (type.ofType) {
      return `${this.getTypeString(type.ofType)}${type.kind === 'NON_NULL' ? '!' : ''}`;
    }
    return type.name || type.kind;
  }

  private generateProductQuery(fields: string[], userQuery: string, limit: number): string {
    const includesVariants = userQuery.toLowerCase().includes('variant') || userQuery.toLowerCase().includes('price');

    let query = `#graphql
query getProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    edges {
      node {
        ${fields.join('\n        ')}`;

    if (includesVariants) {
      query += `
        variants(first: 3) {
          edges {
            node {
              id
              title
              price
              availableForSale
            }
          }
        }`;
    }

    query += `
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

    return query;
  }

  private generateOrderQuery(fields: string[], userQuery: string, limit: number): string {
    const includesCustomer = userQuery.toLowerCase().includes('customer');
    const includesLineItems = userQuery.toLowerCase().includes('item') || userQuery.toLowerCase().includes('product');

    let query = `#graphql
query getOrders($first: Int!, $query: String) {
  orders(first: $first, query: $query) {
    edges {
      node {
        ${fields.join('\n        ')}`;

    if (includesCustomer) {
      query += `
        customer {
          id
          displayName
          email
        }`;
    }

    if (includesLineItems) {
      query += `
        lineItems(first: 3) {
          edges {
            node {
              id
              title
              quantity
            }
          }
        }`;
    }

    query += `
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

    return query;
  }

  private generateCustomerQuery(fields: string[], userQuery: string, limit: number): string {
    return `#graphql
query getCustomers($first: Int!, $query: String) {
  customers(first: $first, query: $query) {
    edges {
      node {
        ${fields.join('\n        ')}
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;
  }

  private generateCollectionQuery(fields: string[], userQuery: string, limit: number): string {
    const includesProducts = userQuery.toLowerCase().includes('product');

    let query = `#graphql
query getCollections($first: Int!, $query: String) {
  collections(first: $first, query: $query) {
    edges {
      node {
        ${fields.join('\n        ')}`;

    if (includesProducts) {
      query += `
        products(first: 3) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }`;
    }

    query += `
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

    return query;
  }
}

export const graphqlIntrospectionService = new GraphQLIntrospectionService();