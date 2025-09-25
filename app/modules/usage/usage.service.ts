import type {
  UsageData,
  UsageLimitCheck,
  UsageStats,
  PlanName,
} from "./usage.types";
import type { IUsageDal } from "./usage.dal";

export class UsageService {
  private readonly planLimits: Record<PlanName, number> = {
    "Free Plan": 20,
    "Pro Plan": 1000,
    "Enterprise Plan": 10_000, // unlimited
  };

  constructor(private dal: IUsageDal) {}

  async trackUsage(data: UsageData) {
    const subscription = await this.getOrCreateSubscription(data.shop);

    return await this.dal.createUsageRecord({
      shop: data.shop,
      subscriptionId: subscription.id,
      userId: data.userId,
      usageType: data.usageType,
      count: data.count || 1,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }

  async getUsageForCurrentMonth(
    shop: string,
    usageType?: string,
  ): Promise<number> {
    const { startOfMonth, endOfMonth } = this.getCurrentMonthDateRange();

    const where: any = {
      shop,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    if (usageType) {
      where.usageType = usageType;
    }

    const records = await this.dal.findUsageRecords(where);
    return records.reduce((total, record) => total + record.count, 0);
  }

  async checkUsageLimit(
    shop: string,
    usageType: string = "chat_query",
  ): Promise<UsageLimitCheck> {
    const subscription = await this.getOrCreateSubscription(shop);
    const limit = this.planLimits[subscription.planName as PlanName] || 20;
    const currentUsage = await this.getUsageForCurrentMonth(shop, usageType);

    return {
      isWithinLimit: limit === -1 || currentUsage < limit,
      currentUsage,
      limit,
      planName: subscription.planName,
    };
  }

  async getUsageStats(shop: string): Promise<UsageStats> {
    const subscription = await this.dal.findSubscriptionWithUsageRecords(shop, {
      gte: this.getCurrentMonthDateRange().startOfMonth,
    });

    if (!subscription) {
      return {
        currentMonthUsage: 0,
        totalUsage: 0,
        subscription: null,
      };
    }

    const currentMonthUsage = subscription.usageRecords.reduce(
      (total: number, record: any) => total + record.count,
      0,
    );

    const totalUsage = await this.dal.countUsageRecords({
      where: { shop },
    });

    return {
      currentMonthUsage,
      totalUsage,
      subscription,
    };
  }

  async updateSubscription(shop: string, planName: PlanName) {
    // Ensure the subscription exists first
    await this.getOrCreateSubscription(shop);

    return await this.dal.updateSubscription(shop, {
      planName,
      status: "active",
    });
  }

  private async getOrCreateSubscription(shop: string) {
    let subscription = await this.dal.findSubscription(shop);

    if (!subscription) {
      subscription = await this.dal.createSubscription({
        shop,
        planName: "Free Plan",
        status: "active",
      });
    }

    return subscription;
  }

  private getCurrentMonthDateRange() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { startOfMonth, endOfMonth };
  }
}
