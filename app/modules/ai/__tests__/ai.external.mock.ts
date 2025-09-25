// Test-only version of AIExternal that doesn't use AI SDK
import type { IAIExternal } from "../ai.external";

export class TestAIExternal implements IAIExternal {
  async buildQuery(
    message: string,
    relevantQueries: { name: string; description: string }[],
  ): Promise<{ query: string }> {
    // Determine operation from message for test
    const lowerMessage = message.toLowerCase();
    let operation = "products";
    if (lowerMessage.includes("order")) operation = "orders";
    if (lowerMessage.includes("customer")) operation = "customers";
    if (lowerMessage.includes("collection")) operation = "collections";

    return {
      query: `#graphql\nquery Get${operation.charAt(0).toUpperCase() + operation.slice(1)} { ${operation}(first: 10) { edges { node { id } } } }`,
    };
  }

  async buildMutation(
    message: string,
    relevantMutations: { name: string; description: string }[],
  ): Promise<{ query: string; variables?: Record<string, any> }> {
    // Generate a simple mutation based on message for testing
    const lowerMessage = message.toLowerCase();
    let mutationName = "productCreate";
    let operation = "product";

    if (lowerMessage.includes("update")) mutationName = "productUpdate";
    if (lowerMessage.includes("delete")) mutationName = "productDelete";
    if (lowerMessage.includes("customer")) {
      mutationName = lowerMessage.includes("create")
        ? "customerCreate"
        : lowerMessage.includes("update")
          ? "customerUpdate"
          : "customerDelete";
      operation = "customer";
    }

    return {
      query: `#graphql\nmutation ${mutationName.charAt(0).toUpperCase() + mutationName.slice(1)} { ${mutationName}(input: {}) { ${operation} { id } userErrors { field message } } }`,
      variables: {},
    };
  }

  async determineRelevantQueries(
    message: string,
    queries: { name: string; description: string }[],
  ): Promise<string[]> {
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
      .slice(0, 3)
      .map((q) => q.name);
  }

  async determineRelevantMutations(
    message: string,
    mutations: { name: string; description: string }[],
  ): Promise<string[]> {
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
      .slice(0, 3)
      .map((m) => m.name);
  }

  async generateSummary(data: any, originalMessage: string): Promise<string> {
    if (!data) return "No data available.";

    return "No data available.";
  }
}
