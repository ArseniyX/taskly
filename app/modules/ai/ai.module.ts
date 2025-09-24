import { AIService } from "./ai.service";
import { AIDal } from "./ai.dal";
import { AIExternal } from "./ai.external";

export class AIModule {
  private static _instance: AIModule;
  private _aiDal: AIDal;
  private _aiExternal: AIExternal;
  private _aiService: AIService;

  private constructor() {
    this._aiDal = new AIDal();
    this._aiExternal = new AIExternal();
    this._aiService = new AIService(this._aiDal, this._aiExternal);
  }

  static getInstance(): AIModule {
    if (!AIModule._instance) {
      AIModule._instance = new AIModule();
    }
    return AIModule._instance;
  }

  get aiDal(): AIDal {
    return this._aiDal;
  }

  get aiExternal(): AIExternal {
    return this._aiExternal;
  }

  get aiService(): AIService {
    return this._aiService;
  }
}

const aiModule = AIModule.getInstance();
export const aiService = aiModule.aiService;