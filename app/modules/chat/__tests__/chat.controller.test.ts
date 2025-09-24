import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatController } from "../chat.controller";
import type { ChatService } from "../chat.service";
import type { ChatMessageData, ChatConversationData } from "../chat.types";

const mockChatService: ChatService = {
  createConversation: vi.fn(),
  getConversations: vi.fn(),
  getConversationById: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
  saveMessage: vi.fn(),
  getMessages: vi.fn(),
  getMessagesByConversation: vi.fn(),
  getChatStats: vi.fn(),
} as any;

describe("ChatController", () => {
  let chatController: ChatController;
  const mockShop = "test-shop.myshopify.com";

  beforeEach(() => {
    chatController = new ChatController(mockChatService);
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    it("should delegate to chat service", async () => {
      const conversationData: ChatConversationData = {
        shop: mockShop,
        title: "Test Conversation",
      };

      const expectedResult = { id: "conv-123", ...conversationData };
      vi.mocked(mockChatService.createConversation).mockResolvedValue(expectedResult as any);

      const result = await chatController.createConversation(conversationData);

      expect(mockChatService.createConversation).toHaveBeenCalledWith(conversationData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("getConversations", () => {
    it("should delegate to chat service", async () => {
      const userId = "user-123";
      const expectedConversations = [
        { id: "conv-1", shop: mockShop, title: "Conversation 1" },
        { id: "conv-2", shop: mockShop, title: "Conversation 2" },
      ];

      vi.mocked(mockChatService.getConversations).mockResolvedValue(expectedConversations as any);

      const result = await chatController.getConversations(mockShop, userId);

      expect(mockChatService.getConversations).toHaveBeenCalledWith(mockShop, userId);
      expect(result).toEqual(expectedConversations);
    });
  });

  describe("saveMessage", () => {
    it("should delegate to chat service", async () => {
      const messageData: ChatMessageData = {
        shop: mockShop,
        message: "Hello world",
        role: "user",
      };

      const expectedMessage = { id: "msg-123", ...messageData };
      vi.mocked(mockChatService.saveMessage).mockResolvedValue(expectedMessage as any);

      const result = await chatController.saveMessage(messageData);

      expect(mockChatService.saveMessage).toHaveBeenCalledWith(messageData);
      expect(result).toEqual(expectedMessage);
    });
  });

  describe("getMessages", () => {
    it("should delegate to chat service with default parameters", async () => {
      const expectedMessages = [
        { id: "msg-1", message: "Hello", role: "user" },
        { id: "msg-2", message: "Hi!", role: "assistant" },
      ];

      vi.mocked(mockChatService.getMessages).mockResolvedValue(expectedMessages as any);

      const result = await chatController.getMessages(mockShop);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(mockShop, undefined, undefined);
      expect(result).toEqual(expectedMessages);
    });

    it("should delegate to chat service with custom parameters", async () => {
      const userId = "user-123";
      const limit = 25;
      const expectedMessages = [{ id: "msg-1", message: "Hello", role: "user" }];

      vi.mocked(mockChatService.getMessages).mockResolvedValue(expectedMessages as any);

      const result = await chatController.getMessages(mockShop, userId, limit);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(mockShop, userId, limit);
      expect(result).toEqual(expectedMessages);
    });
  });

  describe("getMessagesByConversation", () => {
    it("should delegate to chat service", async () => {
      const conversationId = "conv-123";
      const limit = 10;
      const expectedMessages = [
        { id: "msg-1", conversationId, message: "Hello", role: "user" },
      ];

      vi.mocked(mockChatService.getMessagesByConversation).mockResolvedValue(expectedMessages as any);

      const result = await chatController.getMessagesByConversation(conversationId, limit);

      expect(mockChatService.getMessagesByConversation).toHaveBeenCalledWith(conversationId, limit);
      expect(result).toEqual(expectedMessages);
    });
  });

  describe("updateConversation", () => {
    it("should delegate to chat service", async () => {
      const conversationId = "conv-123";
      const updateData = { title: "Updated Title" };
      const expectedConversation = { id: conversationId, shop: mockShop, ...updateData };

      vi.mocked(mockChatService.updateConversation).mockResolvedValue(expectedConversation as any);

      const result = await chatController.updateConversation(conversationId, mockShop, updateData);

      expect(mockChatService.updateConversation).toHaveBeenCalledWith(conversationId, mockShop, updateData);
      expect(result).toEqual(expectedConversation);
    });
  });

  describe("deleteConversation", () => {
    it("should delegate to chat service", async () => {
      const conversationId = "conv-123";
      const expectedConversation = { id: conversationId, shop: mockShop, isActive: false };

      vi.mocked(mockChatService.deleteConversation).mockResolvedValue(expectedConversation as any);

      const result = await chatController.deleteConversation(conversationId, mockShop);

      expect(mockChatService.deleteConversation).toHaveBeenCalledWith(conversationId, mockShop);
      expect(result).toEqual(expectedConversation);
    });
  });

  describe("getChatStats", () => {
    it("should delegate to chat service", async () => {
      const expectedStats = { totalMessages: 150 };

      vi.mocked(mockChatService.getChatStats).mockResolvedValue(expectedStats);

      const result = await chatController.getChatStats(mockShop);

      expect(mockChatService.getChatStats).toHaveBeenCalledWith(mockShop);
      expect(result).toEqual(expectedStats);
    });
  });
});