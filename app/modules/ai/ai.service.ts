import type { QueryResult, IntentType, ShopifyOperation } from "./ai.types";
import type { IAIDal } from "./ai.dal";
import type { IAIExternal } from "./ai.external";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export class AIService {
  constructor(
    private dal: IAIDal,
    private aiExternal: IAIExternal,
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
        relevantQueries,
      );

      // 4. Execute query
      let executionResult;
      let summary;

      try {
        executionResult = await this.dal.executeGraphQLQuery(admin, query);
        summary = await this.aiExternal.generateSummary(
          executionResult,
          message,
        );
      } catch (error) {
        // If query execution fails, use AI to generate a helpful error response
        executionResult = null;
        summary = await this.aiExternal.generateSummary(null, message);
      }

      return {
        query,
        explanation: `Generated a GraphQL query based on: "${message}"`,
        executionResult,
        summary,
        intent: "query",
      };
    } catch (error) {
      return await this.handleError(message, error);
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
      const relevantMutations =
        await this.aiExternal.determineRelevantMutations(
          message,
          schemaInfo.mutations,
        );

      return {
        query: "",
        explanation: `Mutation operations are not yet implemented for safety reasons. Found ${relevantMutations.length} relevant mutations. This feature is coming soon!`,
        summary: `I understand you want to make changes to your store data. For now, I can only read and analyze your store information. Mutation operations will be available in a future update.`,
        intent: "mutation",
      };
    } catch (error) {
      return await this.handleError(message, error);
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

  private async handleError(message: string, error: any): Promise<QueryResult> {
    const summary = await this.aiExternal.generateSummary(null, message);
    return {
      query: "",
      explanation: "An error occurred while processing your request.",
      summary,
      intent: "message",
    };
  }
}
