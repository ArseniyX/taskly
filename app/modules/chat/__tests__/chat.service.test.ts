import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatService } from "../chat.service";
import type { ChatMessageData, ChatConversationData } from "../chat.types";
import type { IChatDal } from "../chat.dal";
import type { UsageService } from "../../usage/usage.service";

const mockChatDal: IChatDal = {
  createConversation: vi.fn(),
  findConversations: vi.fn(),
  findConversationById: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
  createMessage: vi.fn(),
  findMessages: vi.fn(),
  findMessagesByConversation: vi.fn(),
  countMessages: vi.fn(),
};

const mockUsageService: UsageService = {
  trackUsage: vi.fn(),
  checkUsageLimit: vi.fn(),
  getUsageForCurrentMonth: vi.fn(),
  getUsageStats: vi.fn(),
} as any;

describe("ChatService", () => {
  let chatService: ChatService;
  const mockShop = "test-shop.myshopify.com";
  const mockUserId = "user-123";

  beforeEach(() => {
    chatService = new ChatService(mockChatDal, mockUsageService);
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    it("should create a new conversation", async () => {
      const conversationData: ChatConversationData = {
        shop: mockShop,
        userId: mockUserId,
        title: "Test Conversation",
        metadata: { source: "test" },
      };

      const expectedConversation = {
        id: "conv-123",
        ...conversationData,
        metadata: JSON.stringify(conversationData.metadata),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockChatDal.createConversation).mockResolvedValue(expectedConversation as any);

      const result = await chatService.createConversation(conversationData);

      expect(mockChatDal.createConversation).toHaveBeenCalledWith({
        shop: mockShop,
        userId: mockUserId,
        title: "Test Conversation",
        metadata: JSON.stringify({ source: "test" }),
      });
      expect(result).toEqual(expectedConversation);
    });

    it("should handle conversation without metadata", async () => {
      const conversationData: ChatConversationData = {
        shop: mockShop,
        title: "Simple Conversation",
      };

      vi.mocked(mockChatDal.createConversation).mockResolvedValue({} as any);

      await chatService.createConversation(conversationData);

      expect(mockChatDal.createConversation).toHaveBeenCalledWith({
        shop: mockShop,
        userId: undefined,
        title: "Simple Conversation",
        metadata: null,
      });
    });
  });

  describe("saveMessage", () => {
    it("should save user message and track usage", async () => {
      const messageData: ChatMessageData = {
        shop: mockShop,
        userId: mockUserId,
        message: "Hello, how can I help?",
        role: "user",
        conversationId: "conv-123",
      };

      const mockUsageCheck = {
        isWithinLimit: true,
        currentUsage: 5,
        limit: 20,
        planName: "Free Plan",
      };

      const expectedMessage = {
        id: "msg-123",
        ...messageData,
        timestamp: new Date(),
      };

      vi.mocked(mockUsageService.checkUsageLimit).mockResolvedValue(mockUsageCheck);
      vi.mocked(mockChatDal.createMessage).mockResolvedValue(expectedMessage as any);
      vi.mocked(mockUsageService.trackUsage).mockResolvedValue({} as any);

      const result = await chatService.saveMessage(messageData);

      expect(mockUsageService.checkUsageLimit).toHaveBeenCalledWith(mockShop, "chat_query");
      expect(mockChatDal.createMessage).toHaveBeenCalledWith({
        shop: mockShop,
        userId: mockUserId,
        message: "Hello, how can I help?",
        role: "user",
        conversationId: "conv-123",
        metadata: null,
      });
      expect(mockUsageService.trackUsage).toHaveBeenCalledWith({
        shop: mockShop,
        userId: mockUserId,
        usageType: "chat_query",
        metadata: { messageId: "msg-123", conversationId: "conv-123" },
      });
      expect(result).toEqual(expectedMessage);
    });

    it("should save assistant message without tracking usage", async () => {
      const messageData: ChatMessageData = {
        shop: mockShop,
        message: "I can help you with that.",
        role: "assistant",
        metadata: { intent: "response" },
      };

      const expectedMessage = {
        id: "msg-124",
        ...messageData,
        metadata: JSON.stringify(messageData.metadata),
        timestamp: new Date(),
      };

      vi.mocked(mockChatDal.createMessage).mockResolvedValue(expectedMessage as any);

      const result = await chatService.saveMessage(messageData);

      expect(mockUsageService.checkUsageLimit).not.toHaveBeenCalled();
      expect(mockChatDal.createMessage).toHaveBeenCalledWith({
        shop: mockShop,
        userId: undefined,
        message: "I can help you with that.",
        role: "assistant",
        conversationId: undefined,
        metadata: JSON.stringify({ intent: "response" }),
      });
      expect(mockUsageService.trackUsage).not.toHaveBeenCalled();
      expect(result).toEqual(expectedMessage);
    });

    it("should throw error when usage limit exceeded", async () => {
      const messageData: ChatMessageData = {
        shop: mockShop,
        message: "Test message",
        role: "user",
      };

      const mockUsageCheck = {
        isWithinLimit: false,
        currentUsage: 25,
        limit: 20,
        planName: "Free Plan",
      };

      vi.mocked(mockUsageService.checkUsageLimit).mockResolvedValue(mockUsageCheck);

      await expect(chatService.saveMessage(messageData)).rejects.toThrow(
        "Usage limit exceeded. Current usage: 25/20 for Free Plan"
      );

      expect(mockChatDal.createMessage).not.toHaveBeenCalled();
      expect(mockUsageService.trackUsage).not.toHaveBeenCalled();
    });
  });

  describe("getConversations", () => {
    it("should retrieve conversations for shop and user", async () => {
      const expectedConversations = [
        { id: "conv-1", shop: mockShop, userId: mockUserId, title: "Conversation 1" },
        { id: "conv-2", shop: mockShop, userId: mockUserId, title: "Conversation 2" },
      ];

      vi.mocked(mockChatDal.findConversations).mockResolvedValue(expectedConversations as any);

      const result = await chatService.getConversations(mockShop, mockUserId);

      expect(mockChatDal.findConversations).toHaveBeenCalledWith(mockShop, mockUserId);
      expect(result).toEqual(expectedConversations);
    });
  });

  describe("getMessages", () => {
    it("should retrieve messages with default limit", async () => {
      const expectedMessages = [
        { id: "msg-1", message: "Hello", role: "user" },
        { id: "msg-2", message: "Hi there!", role: "assistant" },
      ];

      vi.mocked(mockChatDal.findMessages).mockResolvedValue(expectedMessages as any);

      const result = await chatService.getMessages(mockShop, mockUserId);

      expect(mockChatDal.findMessages).toHaveBeenCalledWith(mockShop, mockUserId, 50);
      expect(result).toEqual(expectedMessages);
    });

    it("should retrieve messages with custom limit", async () => {
      const expectedMessages = [{ id: "msg-1", message: "Hello", role: "user" }];

      vi.mocked(mockChatDal.findMessages).mockResolvedValue(expectedMessages as any);

      const result = await chatService.getMessages(mockShop, mockUserId, 10);

      expect(mockChatDal.findMessages).toHaveBeenCalledWith(mockShop, mockUserId, 10);
      expect(result).toEqual(expectedMessages);
    });
  });

  describe("updateConversation", () => {
    it("should update conversation and refresh timestamp", async () => {
      const conversationId = "conv-123";
      const updateData = {
        title: "Updated Title",
        metadata: { updated: true },
      };

      const expectedConversation = {
        id: conversationId,
        shop: mockShop,
        title: "Updated Title",
        metadata: JSON.stringify(updateData.metadata),
        updatedAt: expect.any(Date),
      };

      vi.mocked(mockChatDal.updateConversation).mockResolvedValue(expectedConversation as any);

      const result = await chatService.updateConversation(conversationId, mockShop, updateData);

      expect(mockChatDal.updateConversation).toHaveBeenCalledWith(
        conversationId,
        mockShop,
        {
          title: "Updated Title",
          metadata: JSON.stringify({ updated: true }),
          updatedAt: expect.any(Date),
        }
      );
      expect(result).toEqual(expectedConversation);
    });
  });

  describe("getChatStats", () => {
    it("should return total message count", async () => {
      vi.mocked(mockChatDal.countMessages).mockResolvedValue(42);

      const result = await chatService.getChatStats(mockShop);

      expect(mockChatDal.countMessages).toHaveBeenCalledWith(mockShop);
      expect(result).toEqual({ totalMessages: 42 });
    });
  });
});