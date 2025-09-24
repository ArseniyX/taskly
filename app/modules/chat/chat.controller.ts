import type { ChatService } from "./chat.service";
import type { ChatMessageData, ChatConversationData } from "./chat.types";

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Conversation operations
  async createConversation(data: ChatConversationData) {
    return await this.chatService.createConversation(data);
  }

  async getConversations(shop: string, userId?: string) {
    return await this.chatService.getConversations(shop, userId);
  }

  async getConversationById(id: string, shop: string) {
    return await this.chatService.getConversationById(id, shop);
  }

  async updateConversation(id: string, shop: string, data: Partial<ChatConversationData>) {
    return await this.chatService.updateConversation(id, shop, data);
  }

  async deleteConversation(id: string, shop: string) {
    return await this.chatService.deleteConversation(id, shop);
  }

  // Message operations
  async saveMessage(data: ChatMessageData) {
    return await this.chatService.saveMessage(data);
  }

  async getMessages(shop: string, userId?: string, limit?: number) {
    return await this.chatService.getMessages(shop, userId, limit);
  }

  async getMessagesByConversation(conversationId: string, limit?: number) {
    return await this.chatService.getMessagesByConversation(conversationId, limit);
  }

  async getChatStats(shop: string) {
    return await this.chatService.getChatStats(shop);
  }
}