export interface UsageData {
  shop: string;
  subscriptionId?: string;
  userId?: string;
  usageType: "chat_query" | "api_call" | "custom";
  count?: number;
  metadata?: any;
}

export interface UsageLimitCheck {
  isWithinLimit: boolean;
  currentUsage: number;
  limit: number;
  planName: string;
}

export interface UsageStats {
  currentMonthUsage: number;
  totalUsage: number;
  subscription: any;
}

export type PlanName = "Free Plan" | "Pro Plan" | "Enterprise Plan";
export type UsageType = "chat_query" | "api_call" | "custom";