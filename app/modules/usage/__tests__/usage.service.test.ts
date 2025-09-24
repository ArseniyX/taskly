import { describe, it, expect, beforeEach, vi } from "vitest";
import { UsageService } from "../usage.service";
import type { UsageData } from "../usage.types";
import type { IUsageDal } from "../usage.dal";

const mockDal: IUsageDal = {
  findSubscription: vi.fn(),
  createSubscription: vi.fn(),
  createUsageRecord: vi.fn(),
  findUsageRecords: vi.fn(),
  countUsageRecords: vi.fn(),
  findSubscriptionWithUsageRecords: vi.fn(),
};

describe("UsageService", () => {
  let usageService: UsageService;
  const mockShop = "test-shop.myshopify.com";
  const mockSubscription = {
    id: "sub-123",
    shop: mockShop,
    planName: "Free Plan",
    status: "active",
  };

  beforeEach(() => {
    usageService = new UsageService(mockDal);
    vi.clearAllMocks();
  });

  describe("trackUsage", () => {
    it("should create usage record for existing subscription", async () => {
      const usageData: UsageData = {
        shop: mockShop,
        usageType: "chat_query",
        userId: "user-123",
        count: 1,
      };

      vi.mocked(mockDal.findSubscription).mockResolvedValue(
        mockSubscription as any,
      );
      vi.mocked(mockDal.createUsageRecord).mockResolvedValue({
        id: "usage-123",
        ...usageData,
        subscriptionId: mockSubscription.id,
      } as any);

      const result = await usageService.trackUsage(usageData);

      expect(mockDal.findSubscription).toHaveBeenCalledWith(mockShop);
      expect(mockDal.createUsageRecord).toHaveBeenCalledWith({
        shop: mockShop,
        subscriptionId: mockSubscription.id,
        userId: "user-123",
        usageType: "chat_query",
        count: 1,
        metadata: null,
      });
      expect(result).toBeDefined();
    });

    it("should create subscription if none exists", async () => {
      const usageData: UsageData = {
        shop: mockShop,
        usageType: "chat_query",
      };

      vi.mocked(mockDal.findSubscription).mockResolvedValue(null);
      vi.mocked(mockDal.createSubscription).mockResolvedValue(
        mockSubscription as any,
      );
      vi.mocked(mockDal.createUsageRecord).mockResolvedValue({
        id: "usage-123",
        ...usageData,
        subscriptionId: mockSubscription.id,
      } as any);

      await usageService.trackUsage(usageData);

      expect(mockDal.createSubscription).toHaveBeenCalledWith({
        shop: mockShop,
        planName: "Free Plan",
        status: "active",
      });
    });
  });

  describe("checkUsageLimit", () => {
    it("should return correct limit status for Free Plan", async () => {
      vi.mocked(mockDal.findSubscription).mockResolvedValue(
        mockSubscription as any,
      );
      vi.mocked(mockDal.findUsageRecords).mockResolvedValue([
        { count: 5 },
        { count: 3 },
      ] as any);

      const result = await usageService.checkUsageLimit(mockShop);

      expect(result).toEqual({
        isWithinLimit: true,
        currentUsage: 8,
        limit: 20,
        planName: "Free Plan",
      });
    });

    it("should return limit exceeded for Free Plan", async () => {
      vi.mocked(mockDal.findSubscription).mockResolvedValue(
        mockSubscription as any,
      );
      vi.mocked(mockDal.findUsageRecords).mockResolvedValue(
        Array(25).fill({ count: 1 }) as any,
      );

      const result = await usageService.checkUsageLimit(mockShop);

      expect(result).toEqual({
        isWithinLimit: false,
        currentUsage: 25,
        limit: 20,
        planName: "Free Plan",
      });
    });

    it("should return unlimited for Enterprise Plan", async () => {
      const enterpriseSubscription = {
        ...mockSubscription,
        planName: "Enterprise Plan",
      };

      vi.mocked(mockDal.findSubscription).mockResolvedValue(
        enterpriseSubscription as any,
      );
      vi.mocked(mockDal.findUsageRecords).mockResolvedValue(
        Array(1000).fill({ count: 1 }) as any,
      );

      const result = await usageService.checkUsageLimit(mockShop);

      expect(result).toEqual({
        isWithinLimit: true,
        currentUsage: 1000,
        limit: -1,
        planName: "Enterprise Plan",
      });
    });
  });

  describe("getUsageForCurrentMonth", () => {
    it("should calculate total usage for current month", async () => {
      const mockRecords = [{ count: 10 }, { count: 5 }, { count: 3 }];

      vi.mocked(mockDal.findUsageRecords).mockResolvedValue(mockRecords as any);

      const result = await usageService.getUsageForCurrentMonth(mockShop);

      expect(result).toBe(18);
      expect(mockDal.findUsageRecords).toHaveBeenCalledWith({
        shop: mockShop,
        date: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
      });
    });

    it("should filter by usage type when provided", async () => {
      vi.mocked(mockDal.findUsageRecords).mockResolvedValue([
        { count: 5 },
      ] as any);

      await usageService.getUsageForCurrentMonth(mockShop, "chat_query");

      expect(mockDal.findUsageRecords).toHaveBeenCalledWith({
        shop: mockShop,
        usageType: "chat_query",
        date: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
      });
    });
  });
});
