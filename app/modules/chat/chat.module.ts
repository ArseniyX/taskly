import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatDal } from "./chat.dal";
import { usageService } from "../usage";
import prisma from "../../db.server";

export class ChatModule {
  private static _instance: ChatModule;
  private _chatDal: ChatDal;
  private _chatService: ChatService;
  private _chatController: ChatController;

  private constructor() {
    this._chatDal = new ChatDal(prisma);
    this._chatService = new ChatService(this._chatDal, usageService);
    this._chatController = new ChatController(this._chatService);
  }

  static getInstance(): ChatModule {
    if (!ChatModule._instance) {
      ChatModule._instance = new ChatModule();
    }
    return ChatModule._instance;
  }

  get chatDal(): ChatDal {
    return this._chatDal;
  }

  get chatService(): ChatService {
    return this._chatService;
  }

  get chatController(): ChatController {
    return this._chatController;
  }
}

const chatModule = ChatModule.getInstance();
export const chatService = chatModule.chatService;
export const chatController = chatModule.chatController;