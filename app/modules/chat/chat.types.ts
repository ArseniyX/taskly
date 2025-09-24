export interface ChatMessageData {
  shop: string;
  userId?: string;
  message: string;
  role: string;
  conversationId?: string;
  metadata?: any;
}

export interface ChatConversationData {
  shop: string;
  userId?: string;
  title?: string;
  metadata?: any;
}

export interface ChatProcessingResult {
  response: string;
  intent: string;
  query?: string;
  executionResult?: any;
}

export interface ChatMessageWithMetadata {
  id: string;
  shop: string;
  userId?: string | null;
  message: string;
  role: string;
  conversationId?: string | null;
  metadata?: string | null;
  timestamp: Date;
}

export interface ChatConversationWithMessages {
  id: string;
  shop: string;
  userId?: string | null;
  title?: string | null;
  isActive: boolean;
  metadata?: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages?: ChatMessageWithMetadata[];
}

export type MessageRole = string;
export type ChatIntent = "query" | "mutation" | "message" | "error";
