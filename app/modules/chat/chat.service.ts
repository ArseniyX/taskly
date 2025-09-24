import type {
  ChatMessageData,
  ChatConversationData,
  ChatMessageWithMetadata,
  ChatConversationWithMessages
} from "./chat.types";
import type { IChatDal } from "./chat.dal";
import type { UsageService } from "../usage/usage.service";

export class ChatService {
  constructor(
    private dal: IChatDal,
    private usageService: UsageService
  ) {}

  // Conversation management
  async createConversation(data: ChatConversationData): Promise<ChatConversationWithMessages> {
    return await this.dal.createConversation({
      shop: data.shop,
      userId: data.userId,
      title: data.title,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }

  async getConversations(shop: string, userId?: string): Promise<ChatConversationWithMessages[]> {
    return await this.dal.findConversations(shop, userId);
  }

  async getConversationById(id: string, shop: string): Promise<ChatConversationWithMessages | null> {
    return await this.dal.findConversationById(id, shop);
  }

  async updateConversation(
    id: string,
    shop: string,
    data: Partial<ChatConversationData>
  ): Promise<ChatConversationWithMessages> {
    return await this.dal.updateConversation(id, shop, {
      title: data.title,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      updatedAt: new Date(),
    });
  }

  async deleteConversation(id: string, shop: string): Promise<ChatConversationWithMessages> {
    return await this.dal.deleteConversation(id, shop);
  }

  // Message management
  async saveMessage(data: ChatMessageData): Promise<ChatMessageWithMetadata> {
    // Check usage limits for user messages (queries)
    if (data.role === "user") {
      const usageCheck = await this.usageService.checkUsageLimit(data.shop, "chat_query");
      if (!usageCheck.isWithinLimit) {
        throw new Error(
          `Usage limit exceeded. Current usage: ${usageCheck.currentUsage}/${usageCheck.limit} for ${usageCheck.planName}`
        );
      }
    }

    const message = await this.dal.createMessage({
      shop: data.shop,
      userId: data.userId,
      message: data.message,
      role: data.role,
      conversationId: data.conversationId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });

    // Track usage for user messages (queries)
    if (data.role === "user") {
      await this.usageService.trackUsage({
        shop: data.shop,
        userId: data.userId,
        usageType: "chat_query",
        metadata: { messageId: message.id, conversationId: data.conversationId },
      });
    }

    return message;
  }

  async getMessages(shop: string, userId?: string, limit: number = 50): Promise<ChatMessageWithMetadata[]> {
    return await this.dal.findMessages(shop, userId, limit);
  }

  async getMessagesByConversation(conversationId: string, limit: number = 50): Promise<ChatMessageWithMetadata[]> {
    return await this.dal.findMessagesByConversation(conversationId, limit);
  }

  async getChatStats(shop: string): Promise<{ totalMessages: number }> {
    const totalMessages = await this.dal.countMessages(shop);
    return { totalMessages };
  }
}