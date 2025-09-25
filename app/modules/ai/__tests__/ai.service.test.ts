import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIService } from "../ai.service";
import type { IAIDal } from "../ai.dal";
import { TestAIExternal } from "./ai.external.mock";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

const mockAIDal: IAIDal = {
  executeGraphQLQuery: vi.fn(),
  getSchemaInfo: vi.fn(),
  findQueriesByNames: vi.fn(),
  findMutationsByNames: vi.fn(),
};

const mockAdmin = {
  graphql: vi.fn(),
} as any as AdminApiContext;

describe("AIService", () => {
  let aiService: AIService;
  let testAIExternal: TestAIExternal;

  beforeEach(() => {
    testAIExternal = new TestAIExternal();
    aiService = new AIService(mockAIDal, testAIExternal);
    vi.clearAllMocks();
  });

  describe("identifyIntent", () => {
    it("should identify query intent", async () => {
      const queryMessages = [
        "show me my products",
        "list all orders",
        "get customers",
        "find inventory",
        "how many products do I have?",
      ];

      queryMessages.forEach((message) => {
        const result = aiService.identifyIntent(message);
        expect(result).toBe("query");
      });
    });

    it("should identify mutation intent", async () => {
      const mutationMessages = [
        "create a new product",
        "update customer information",
        "delete old orders",
        "add new collection",
        "modify product price",
      ];

      mutationMessages.forEach((message) => {
        const result = aiService.identifyIntent(message);
        expect(result).toBe("mutation");
      });
    });

    it("should identify message intent for general conversation", async () => {
      const messageMessages = [
        "hello",
        "how are you?",
        "thanks for your help",
        "can you help me?",
      ];

      messageMessages.forEach((message) => {
        const result = aiService.identifyIntent(message);
        expect(result).toBe("message");
      });
    });

    it("should prioritize mutation over query when both keywords are present", async () => {
      const result = aiService.identifyIntent("create a product and show me the list");
      expect(result).toBe("mutation");
    });
  });

  describe("processMessage", () => {
    it("should handle general message conversations", async () => {
      const message = "hello there";

      const result = await aiService.processMessage(mockAdmin, message);

      expect(result.intent).toBe("message");
      expect(result.summary).toMatch(/I can help you|What would you like|Feel free to ask/);
      expect(result.explanation).toContain("general message");
      expect(mockAIDal.getSchemaInfo).not.toHaveBeenCalled();
      expect(mockAIDal.executeGraphQLQuery).not.toHaveBeenCalled();
    });

    it("should handle query messages and execute GraphQL", async () => {
      const message = "show me my products";
      const mockSchemaInfo = {
        queries: [{ name: "products", description: "List products" }],
        mutations: [],
      };
      const mockRelevantQueries = [
        { name: "products", description: "List products", args: [], type: { name: "Connection", kind: "OBJECT" } }
      ];
      const mockExecutionResult = {
        products: {
          edges: [{ node: { id: "gid://shopify/Product/1", title: "Test Product" } }]
        }
      };

      vi.mocked(mockAIDal.getSchemaInfo).mockResolvedValue(mockSchemaInfo);
      vi.mocked(mockAIDal.findQueriesByNames).mockResolvedValue(mockRelevantQueries);
      vi.mocked(mockAIDal.executeGraphQLQuery).mockResolvedValue(mockExecutionResult);

      const result = await aiService.processMessage(mockAdmin, message);

      expect(result.intent).toBe("query");
      expect(result.query).toContain("products");
      expect(result.executionResult).toEqual(mockExecutionResult);
      expect(mockAIDal.getSchemaInfo).toHaveBeenCalledWith(mockAdmin);
      expect(mockAIDal.findQueriesByNames).toHaveBeenCalledWith(["products"], mockAdmin);
      expect(mockAIDal.executeGraphQLQuery).toHaveBeenCalled();
    });

    it("should handle mutation messages and generate GraphQL without execution", async () => {
      const message = "create a new product";
      const mockSchemaInfo = {
        queries: [],
        mutations: [{ name: "productCreate", description: "Create a product" }],
      };
      const mockRelevantMutations = [
        { name: "productCreate", description: "Create a product", args: [], type: { name: "Payload", kind: "OBJECT" } }
      ];

      vi.mocked(mockAIDal.getSchemaInfo).mockResolvedValue(mockSchemaInfo);
      vi.mocked(mockAIDal.findMutationsByNames).mockResolvedValue(mockRelevantMutations);

      const result = await aiService.processMessage(mockAdmin, message);

      expect(result.intent).toBe("mutation");
      expect(result.query).toContain("productCreate");
      expect(result.explanation).toContain("safety");
      expect(result.summary).toContain("review it carefully");
      expect(result.executionResult).toBeNull();
      expect(mockAIDal.getSchemaInfo).toHaveBeenCalledWith(mockAdmin);
      expect(mockAIDal.findMutationsByNames).toHaveBeenCalledWith(["productCreate"], mockAdmin);
      expect(mockAIDal.executeGraphQLQuery).not.toHaveBeenCalled();
    });

    it("should handle query execution errors gracefully", async () => {
      const message = "show me my orders";
      const mockSchemaInfo = {
        queries: [{ name: "orders", description: "List orders" }],
        mutations: [],
      };
      const mockRelevantQueries = [
        { name: "orders", description: "List orders", args: [], type: { name: "Connection", kind: "OBJECT" } }
      ];

      vi.mocked(mockAIDal.getSchemaInfo).mockResolvedValue(mockSchemaInfo);
      vi.mocked(mockAIDal.findQueriesByNames).mockResolvedValue(mockRelevantQueries);
      vi.mocked(mockAIDal.executeGraphQLQuery).mockRejectedValue(new Error("GraphQL execution failed"));

      const result = await aiService.processMessage(mockAdmin, message);

      expect(result.intent).toBe("query");
      expect(result.executionResult).toBeNull();
      expect(result.summary).toBe("No data available.");
    });

    it("should handle schema fetch errors", async () => {
      const message = "show me my products";

      vi.mocked(mockAIDal.getSchemaInfo).mockRejectedValue(new Error("Schema fetch failed"));

      const result = await aiService.processMessage(mockAdmin, message);

      expect(result.intent).toBe("message");
      expect(result.summary).toBe("No data available.");
    });
  });
});