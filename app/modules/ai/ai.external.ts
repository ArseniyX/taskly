import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface IAIExternal {
  buildQuery(
    message: string,
    relevantQueries: { name: string; description: string }[],
  ): Promise<{ query: string; variables?: Record<string, any> }>;

  buildMutation(
    message: string,
    relevantMutations: { name: string; description: string }[],
  ): Promise<{ query: string; variables?: Record<string, any> }>;

  determineRelevantQueries(
    message: string,
    queries: { name: string; description: string }[],
  ): Promise<string[]>;

  determineRelevantMutations(
    message: string,
    mutations: { name: string; description: string }[],
  ): Promise<string[]>;

  generateSummary(data: any, originalMessage: string): Promise<string>;
}

export class AIExternal implements IAIExternal {
  private model: any;

  constructor() {}

  async buildQuery(
    message: string,
    relevantQueries: { name: string; description: string }[],
  ): Promise<{ query: string }> {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `
You are a GraphQL expert for the Shopify Admin API. 
Generate a complete GraphQL query inline (no variables, no $variables section). 

User message: "${message}"
Available queries: ${JSON.stringify(relevantQueries, null, 2)}

Requirements:
1. Return only a valid GraphQL query, no explanations or extra text, no markdown formatting, no json, etc.
2. Use correct Shopify Admin API query names.
3. Always inline arguments (e.g. products(first: 10), not products(first: $first)).
4. Include pagination with first: 10 where applicable.
5. Use standard Shopify edge/node structure.
6. Select common useful fields like id, title/name, status, createdAt, etc.
      `,
      });

      return {
        query: text.trim(),
      };
    } catch (error) {
      return {
        query: "",
      };
    }
  }

  async buildMutation(
    message: string,
    relevantMutations: { name: string; description: string }[],
  ): Promise<{ query: string; variables?: Record<string, any> }> {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
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
    queries: { name: string; description: string }[],
  ): Promise<string[]> {
    try {
      const queryNames = queries.map((query) => query.name).join(",");
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `
Analyze this user message and determine the most relevant Shopify GraphQL queries.

User message: "${message}"
Available queries: ${queryNames}

Return the top 3 most relevant queries as JSON array. Consider:
- Keywords in the message
- Intent of the user
- Semantic similarity between message and query descriptions

Respond with JSON only: ["queryName", "queryName2", "queryName3"]
        `,
      });

      const parsed = JSON.parse(text.trim());
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (error) {
      // Fallback to keyword matching
      console.error("Error determining relevant queries:", error);
      return [];
    }
  }

  async determineRelevantMutations(
    message: string,
    mutations: { name: string; description: string }[],
  ): Promise<string[]> {
    try {
      const mutationNames = mutations
        .map((mutation) => mutation.name)
        .join(",");
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `
Analyze this user message and determine the most relevant Shopify GraphQL mutations.

User message: "${message}"
Available mutations: ${mutationNames}

Return the top 3 most relevant mutations as JSON array. Consider:
- Action keywords (create, update, delete, etc.)
- Target entities (product, order, customer, etc.)
- Semantic similarity

Respond with JSON only, no markdown no explanations: ["mutationName1", "mutationName2", "mutationName3"]
        `,
      });

      const parsed = JSON.parse(text.trim());
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (error) {
      // Fallback to keyword matching
      return [];
    }
  }

  async generateSummary(data: any, originalMessage: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `
Generate a friendly, informative summary of this Shopify data for a store owner.

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
      return "No data available.";
    }
  }
}
