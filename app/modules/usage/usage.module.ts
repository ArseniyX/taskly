import { UsageService } from "./usage.service";
import { UsageController } from "./usage.controller";
import { UsageDal } from "./usage.dal";
import prisma from "../../db.server";

export class UsageModule {
  private static _instance: UsageModule;
  private _usageDal: UsageDal;
  private _usageService: UsageService;
  private _usageController: UsageController;

  private constructor() {
    this._usageDal = new UsageDal(prisma);
    this._usageService = new UsageService(this._usageDal);
    this._usageController = new UsageController(this._usageService);
  }

  static getInstance(): UsageModule {
    if (!UsageModule._instance) {
      UsageModule._instance = new UsageModule();
    }
    return UsageModule._instance;
  }

  get usageDal(): UsageDal {
    return this._usageDal;
  }

  get usageService(): UsageService {
    return this._usageService;
  }

  get usageController(): UsageController {
    return this._usageController;
  }
}

const usageModule = UsageModule.getInstance();
export const usageService = usageModule.usageService;
export const usageController = usageModule.usageController;