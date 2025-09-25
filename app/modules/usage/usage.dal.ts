import type { Subscription, UsageRecord } from "@prisma/client";

export interface IUsageDal {
  findSubscription(shop: string): Promise<Subscription | null>;
  createSubscription(data: { shop: string; planName: string; status: string }): Promise<Subscription>;
  updateSubscription(shop: string, data: { planName?: string; status?: string }): Promise<Subscription>;
  createUsageRecord(data: {
    shop: string;
    subscriptionId: string;
    userId?: string;
    usageType: string;
    count: number;
    metadata?: string | null;
  }): Promise<UsageRecord>;
  findUsageRecords(where: any): Promise<UsageRecord[]>;
  countUsageRecords(where: any): Promise<number>;
  findSubscriptionWithUsageRecords(shop: string, dateFilter: any): Promise<any>;
}

export class UsageDal implements IUsageDal {
  constructor(private prisma: any) {}

  async findSubscription(shop: string): Promise<Subscription | null> {
    return await this.prisma.subscription.findUnique({
      where: { shop },
    });
  }

  async createSubscription(data: { shop: string; planName: string; status: string }): Promise<Subscription> {
    return await this.prisma.subscription.create({
      data,
    });
  }

  async updateSubscription(shop: string, data: { planName?: string; status?: string }): Promise<Subscription> {
    return await this.prisma.subscription.update({
      where: { shop },
      data,
    });
  }

  async createUsageRecord(data: {
    shop: string;
    subscriptionId: string;
    userId?: string;
    usageType: string;
    count: number;
    metadata?: string | null;
  }): Promise<UsageRecord> {
    return await this.prisma.usageRecord.create({
      data,
    });
  }

  async findUsageRecords(where: any): Promise<UsageRecord[]> {
    return await this.prisma.usageRecord.findMany({ where });
  }

  async countUsageRecords(where: any): Promise<number> {
    return await this.prisma.usageRecord.count({ where });
  }

  async findSubscriptionWithUsageRecords(shop: string, dateFilter: any) {
    return await this.prisma.subscription.findUnique({
      where: { shop },
      include: {
        usageRecords: {
          where: {
            date: dateFilter,
          },
        },
      },
    });
  }
}