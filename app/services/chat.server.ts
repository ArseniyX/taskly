import prisma from "../db.server";

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
    return await prisma.chatMessage.create({
      data: {
        shop: data.shop,
        userId: data.userId,
        message: data.message,
        role: data.role,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
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