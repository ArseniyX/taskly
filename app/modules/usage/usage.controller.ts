import type { UsageService } from "./usage.service";
import type { UsageData } from "./usage.types";

export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  async trackUsage(data: UsageData) {
    return await this.usageService.trackUsage(data);
  }

  async getCurrentMonthUsage(shop: string, usageType?: string) {
    return await this.usageService.getUsageForCurrentMonth(shop, usageType);
  }

  async checkUsageLimit(shop: string, usageType?: string) {
    return await this.usageService.checkUsageLimit(shop, usageType);
  }

  async getUsageStats(shop: string) {
    return await this.usageService.getUsageStats(shop);
  }
}
