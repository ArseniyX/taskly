import { describe, it, expect, beforeEach, vi } from "vitest";
import { UsageController } from "../usage.controller";
import type { UsageService } from "../usage.service";
import type { UsageData, UsageLimitCheck } from "../usage.types";

const mockUsageService: UsageService = {
  trackUsage: vi.fn(),
  getUsageForCurrentMonth: vi.fn(),
  checkUsageLimit: vi.fn(),
  getUsageStats: vi.fn(),
} as any;

describe("UsageController", () => {
  let usageController: UsageController;

  beforeEach(() => {
    usageController = new UsageController(mockUsageService);
    vi.clearAllMocks();
  });

  describe("trackUsage", () => {
    it("should delegate to usage service", async () => {
      const usageData: UsageData = {
        shop: "test-shop.myshopify.com",
        usageType: "chat_query",
        count: 1,
      };

      const expectedResult = { id: "usage-123", ...usageData };
      vi.mocked(mockUsageService.trackUsage).mockResolvedValue(
        expectedResult as any,
      );

      const result = await usageController.trackUsage(usageData);

      expect(mockUsageService.trackUsage).toHaveBeenCalledWith(usageData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("checkUsageLimit", () => {
    it("should delegate to usage service", async () => {
      const shop = "test-shop.myshopify.com";
      const expectedResult: UsageLimitCheck = {
        isWithinLimit: true,
        currentUsage: 10,
        limit: 20,
        planName: "Free Plan",
      };

      vi.mocked(mockUsageService.checkUsageLimit).mockResolvedValue(
        expectedResult,
      );

      const result = await usageController.checkUsageLimit(shop);

      expect(mockUsageService.checkUsageLimit).toHaveBeenCalledWith(
        shop,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe("getCurrentMonthUsage", () => {
    it("should delegate to usage service", async () => {
      const shop = "test-shop.myshopify.com";
      const usageType = "chat_query";

      vi.mocked(mockUsageService.getUsageForCurrentMonth).mockResolvedValue(15);

      const result = await usageController.getCurrentMonthUsage(
        shop,
        usageType,
      );

      expect(mockUsageService.getUsageForCurrentMonth).toHaveBeenCalledWith(
        shop,
        usageType,
      );
      expect(result).toBe(15);
    });
  });

  describe("getUsageStats", () => {
    it("should delegate to usage service", async () => {
      const shop = "test-shop.myshopify.com";
      const expectedStats = {
        currentMonthUsage: 10,
        totalUsage: 50,
        subscription: { planName: "Pro Plan" },
      };

      vi.mocked(mockUsageService.getUsageStats).mockResolvedValue(
        expectedStats,
      );

      const result = await usageController.getUsageStats(shop);

      expect(mockUsageService.getUsageStats).toHaveBeenCalledWith(shop);
      expect(result).toEqual(expectedStats);
    });
  });
});
