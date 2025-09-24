import type { ChatMessage, ChatConversation } from "@prisma/client";

export interface IChatDal {
  // Conversation operations
  createConversation(data: {
    shop: string;
    userId?: string;
    title?: string;
    metadata?: string | null;
  }): Promise<ChatConversation>;
  findConversations(shop: string, userId?: string): Promise<ChatConversation[]>;
  findConversationById(
    id: string,
    shop: string,
  ): Promise<ChatConversation | null>;
  updateConversation(
    id: string,
    shop: string,
    data: { title?: string; metadata?: string; updatedAt?: Date },
  ): Promise<ChatConversation>;
  deleteConversation(id: string, shop: string): Promise<ChatConversation>;

  // Message operations
  createMessage(data: {
    shop: string;
    userId?: string;
    message: string;
    role: string;
    conversationId?: string;
    metadata?: string | null;
  }): Promise<ChatMessage>;
  findMessages(
    shop: string,
    userId?: string,
    limit?: number,
  ): Promise<ChatMessage[]>;
  findMessagesByConversation(
    conversationId: string,
    limit?: number,
  ): Promise<ChatMessage[]>;
  countMessages(shop: string): Promise<number>;
}

export class ChatDal implements IChatDal {
  constructor(private prisma: any) {}

  // Conversation operations
  async createConversation(data: {
    shop: string;
    userId?: string;
    title?: string;
    metadata?: string | null;
  }): Promise<ChatConversation> {
    return await this.prisma.chatConversation.create({
      data,
    });
  }

  async findConversations(
    shop: string,
    userId?: string,
  ): Promise<ChatConversation[]> {
    return await this.prisma.chatConversation.findMany({
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

  async findConversationById(
    id: string,
    shop: string,
  ): Promise<ChatConversation | null> {
    return await this.prisma.chatConversation.findUnique({
      where: {
        id,
        shop,
      },
    });
  }

  async updateConversation(
    id: string,
    shop: string,
    data: { title?: string; metadata?: string; updatedAt?: Date },
  ): Promise<ChatConversation> {
    return await this.prisma.chatConversation.update({
      where: {
        id,
        shop,
      },
      data,
    });
  }

  async deleteConversation(
    id: string,
    shop: string,
  ): Promise<ChatConversation> {
    return await this.prisma.chatConversation.update({
      where: {
        id,
        shop,
      },
      data: {
        isActive: false,
      },
    });
  }

  // Message operations
  async createMessage(data: {
    shop: string;
    userId?: string;
    message: string;
    role: "user" | "assistant";
    conversationId?: string;
    metadata?: string | null;
  }): Promise<ChatMessage> {
    return await this.prisma.chatMessage.create({
      data,
    });
  }

  async findMessages(
    shop: string,
    userId?: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    return await this.prisma.chatMessage.findMany({
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

  async findMessagesByConversation(
    conversationId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    return await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: "asc",
      },
      take: limit,
    });
  }

  async countMessages(shop: string): Promise<number> {
    return await this.prisma.chatMessage.count({
      where: { shop },
    });
  }
}
