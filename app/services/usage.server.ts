import prisma from "../db.server";

export interface UsageData {
  shop: string;
  subscriptionId?: string;
  userId?: string;
  usageType: "chat_query" | "api_call" | "custom";
  count?: number;
  metadata?: any;
}

export class UsageService {
  async trackUsage(data: UsageData) {
    // Get or create subscription for the shop
    let subscription = await prisma.subscription.findUnique({
      where: { shop: data.shop },
    });

    if (!subscription) {
      // Create a free plan subscription if none exists
      subscription = await prisma.subscription.create({
        data: {
          shop: data.shop,
          planName: "Free Plan",
          status: "active",
        },
      });
    }

    // Record the usage
    return await prisma.usageRecord.create({
      data: {
        shop: data.shop,
        subscriptionId: subscription.id,
        userId: data.userId,
        usageType: data.usageType,
        count: data.count || 1,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  async getUsageForCurrentMonth(shop: string, usageType?: string) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

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

    const records = await prisma.usageRecord.findMany({ where });
    return records.reduce((total, record) => total + record.count, 0);
  }

  async checkUsageLimit(shop: string, usageType: string = "chat_query"): Promise<{
    isWithinLimit: boolean;
    currentUsage: number;
    limit: number;
    planName: string;
  }> {
    let subscription = await prisma.subscription.findUnique({
      where: { shop },
    });

    if (!subscription) {
      // Create a free plan subscription if none exists
      subscription = await prisma.subscription.create({
        data: {
          shop: shop,
          planName: "Free Plan",
          status: "active",
        },
      });
    }

    // Define plan limits
    const planLimits = {
      "Free Plan": 20,
      "Pro Plan": 10000,
      "Enterprise Plan": -1, // unlimited
    };

    const limit = planLimits[subscription.planName as keyof typeof planLimits] || 20;
    const currentUsage = await this.getUsageForCurrentMonth(shop, usageType);

    return {
      isWithinLimit: limit === -1 || currentUsage < limit,
      currentUsage,
      limit,
      planName: subscription.planName,
    };
  }

  async getUsageStats(shop: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { shop },
      include: {
        usageRecords: {
          where: {
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    if (!subscription) {
      return {
        currentMonthUsage: 0,
        totalUsage: 0,
        subscription: null,
      };
    }

    const currentMonthUsage = subscription.usageRecords.reduce(
      (total, record) => total + record.count,
      0
    );

    const totalUsage = await prisma.usageRecord.count({
      where: { shop },
    });

    return {
      currentMonthUsage,
      totalUsage,
      subscription,
    };
  }
}

export const usageService = new UsageService();