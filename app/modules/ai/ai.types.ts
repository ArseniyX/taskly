export interface QueryResult {
  query: string;
  explanation: string;
  executionResult?: any;
  summary: string;
  intent: "query" | "mutation" | "message";
}

export interface SchemaInfo {
  queries: { name: string; description: string }[];
  mutations: { name: string; description: string }[];
}

export interface GraphQLOperation {
  query: string;
  variables?: Record<string, any>;
}

export interface MockDataResult {
  executionResult: any;
  summary: string;
}

export type IntentType = "query" | "mutation" | "message";

export type ShopifyOperation = "products" | "orders" | "customers" | "collections";