import prisma from "../db.server";
import { usageService } from "../modules/usage";

export interface ChatMessageData {
  shop: string;
  userId?: string;
  message: string;
  role: "user" | "assistant";
  metadata?: any;
}

export interface ChatConversationData {
  shop: string;
  userId?: string;
  title?: string;
  metadata?: any;
}

export class ChatService {
  async createConversation(data: ChatConversationData) {
    return await prisma.chatConversation.create({
      data: {
        shop: data.shop,
        userId: data.userId,
        title: data.title,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  async getConversations(shop: string, userId?: string) {
    return await prisma.chatConversation.findMany({
      where: {
        shop,
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async saveMessage(data: ChatMessageData) {
    // Check usage limits for user messages (queries)
    if (data.role === "user") {
      const usageCheck = await usageService.checkUsageLimit(data.shop, "chat_query");
      if (!usageCheck.isWithinLimit) {
        throw new Error(`Usage limit exceeded. Current usage: ${usageCheck.currentUsage}/${usageCheck.limit} for ${usageCheck.planName}`);
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        shop: data.shop,
        userId: data.userId,
        message: data.message,
        role: data.role,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    // Track usage for user messages (queries)
    if (data.role === "user") {
      await usageService.trackUsage({
        shop: data.shop,
        userId: data.userId,
        usageType: "chat_query",
        metadata: { messageId: message.id },
      });
    }

    return message;
  }

  async getMessages(shop: string, userId?: string, limit: number = 50) {
    return await prisma.chatMessage.findMany({
      where: {
        shop,
        userId,
      },
      orderBy: {
        timestamp: "asc",
      },
      take: limit,
    });
  }

  async getMessagesByConversation(conversationId: string, limit: number = 50) {
    // For now, we'll use shop-based filtering since we don't have conversation linking
    // This can be enhanced later to link messages to specific conversations
    return await prisma.chatMessage.findMany({
      orderBy: {
        timestamp: "asc",
      },
      take: limit,
    });
  }

  async deleteConversation(id: string, shop: string) {
    return await prisma.chatConversation.update({
      where: {
        id,
        shop,
      },
      data: {
        isActive: false,
      },
    });
  }

  async updateConversation(id: string, shop: string, data: Partial<ChatConversationData>) {
    return await prisma.chatConversation.update({
      where: {
        id,
        shop,
      },
      data: {
        title: data.title,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        updatedAt: new Date(),
      },
    });
  }
}

export const chatService = new ChatService();