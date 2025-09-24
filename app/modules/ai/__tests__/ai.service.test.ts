import { describe, it, expect, beforeEach, vi } from "vitest";
import { AIService } from "../ai.service";
import type { IAIDal } from "../ai.dal";
import { TestAIExternal } from "../ai.external.mock";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

const mockAIDal: IAIDal = {
  executeGraphQLQuery: vi.fn(),
  getSchemaInfo: vi.fn(),
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

    it("should handle mutation messages with not implemented response", async () => {
      const message = "create a new product";
      const mockSchemaInfo = {
        queries: [],
        mutations: [{ name: "productCreate", description: "Create a product" }],
      };

      vi.mocked(mockAIDal.getSchemaInfo).mockResolvedValue(mockSchemaInfo);

      const result = await aiService.processMessage(mockAdmin, message);

      expect(result.intent).toBe("mutation");
      expect(result.summary).toContain("future update");
      expect(result.explanation).toContain("safety reasons");
      expect(mockAIDal.executeGraphQLQuery).not.toHaveBeenCalled();
    });
  });
});