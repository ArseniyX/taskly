import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Select,
  Badge,
  DataTable,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);

  try {
    // First check local subscription data
    const localSubscription = await db.subscription.findUnique({
      where: { shop: session.shop },
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

    const billingCheck = await billing.require({
      plans: ["Pro Plan", "Enterprise Plan"],
      isTest: true,
      onFailure: async () => {
        return redirect("/billing");
      },
    });

    // Calculate current month usage
    const currentMonthUsage = localSubscription?.usageRecords.reduce(
      (total, record) => total + record.count,
      0
    ) || 0;

    if (billingCheck.hasActivePayment) {
      // Sync subscription data if needed
      if (!localSubscription || localSubscription.status !== "active") {
        await db.subscription.upsert({
          where: { shop: session.shop },
          update: {
            status: "active",
            shopifySubscriptionId: (billingCheck as any).payment?.id,
            planName: (billingCheck as any).payment?.name || "Pro Plan",
            isTest: (billingCheck as any).payment?.test || true,
          },
          create: {
            shop: session.shop,
            planName: (billingCheck as any).payment?.name || "Pro Plan",
            status: "active",
            shopifySubscriptionId: (billingCheck as any).payment?.id,
            isTest: (billingCheck as any).payment?.test || true,
          },
        });
      }

      return json({
        billing: billingCheck,
        hasActivePayment: true,
        currentPlan: (billingCheck as any).payment?.name || "Pro Plan",
        subscription: localSubscription,
        currentMonthUsage,
      });
    }

    // No active payment - ensure local subscription reflects this
    if (localSubscription && localSubscription.status === "active") {
      await db.subscription.update({
        where: { shop: session.shop },
        data: { status: "canceled", canceledAt: new Date() },
      });
    }

    return json({
      billing: billingCheck,
      hasActivePayment: false,
      currentPlan: "free",
      subscription: localSubscription,
      currentMonthUsage,
    });
  } catch (error) {
    const localSubscription = await db.subscription.findUnique({
      where: { shop: session.shop },
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

    const currentMonthUsage = localSubscription?.usageRecords.reduce(
      (total, record) => total + record.count,
      0
    ) || 0;

    return json({
      billing: null,
      hasActivePayment: false,
      currentPlan: "free",
      error: "Failed to check billing status",
      subscription: localSubscription,
      currentMonthUsage,
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const planId = formData.get("planId") as string;

  if (intent === "subscribe") {
    try {
      await billing.request({
        plan: planId as "Pro Plan" | "Enterprise Plan",
        isTest: true,
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/subscription?subscribed=1`,
      });

      // Save subscription to database
      await db.subscription.upsert({
        where: { shop: session.shop },
        update: {
          planName: planId,
          status: "trialing", // Will be updated when payment completes
          updatedAt: new Date(),
        },
        create: {
          shop: session.shop,
          planName: planId,
          status: "trialing",
          isTest: true,
        },
      });

      return json({
        success: true,
        message: `Redirecting to payment for ${planId}`,
        planId,
      });
    } catch (error) {
      return json({
        success: false,
        error: "Failed to initiate subscription process",
      });
    }
  }

  if (intent === "cancel") {
    try {
      const billingCheck = await billing.require({
        plans: ["Pro Plan", "Enterprise Plan"],
        isTest: true,
        onFailure: async () => {
          return json({
            success: false,
            error: "No active subscription found",
          });
        },
      });

      if (billingCheck.hasActivePayment) {
        await billing.cancel({
          subscriptionId: (billingCheck as any).payment.id,
          isTest: true,
          prorate: true,
        });

        // Update local subscription status
        await db.subscription.update({
          where: { shop: session.shop },
          data: {
            status: "canceled",
            canceledAt: new Date(),
          },
        });

        return json({
          success: true,
          message: "Subscription cancelled successfully",
        });
      }

      return json({
        success: false,
        error: "No active subscription found",
      });
    } catch (error) {
      return json({
        success: false,
        error: "Failed to cancel subscription",
      });
    }
  }

  return json({ success: false, error: "Invalid intent" });
};

export default function SubscriptionManagement() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [selectedPlan, setSelectedPlan] = useState("Basic Plan");

  const currentPlan = loaderData.hasActivePayment
    ? (loaderData.billing as any)?.payment?.name || "paid"
    : "free";

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  const handlePlanChange = useCallback((value: string) => {
    setSelectedPlan(value);
  }, []);

  const handleSubscribe = useCallback(() => {
    fetcher.submit(
      { intent: "subscribe", planId: selectedPlan },
      { method: "POST" },
    );
  }, [selectedPlan, fetcher]);

  const handleCancel = useCallback(() => {
    fetcher.submit({ intent: "cancel" }, { method: "POST" });
  }, [fetcher]);

  const planOptions = [
    { label: "Basic Plan - Free", value: "Free Plan" },
    { label: "Pro Plan - $29.99", value: "Pro Plan" },
    { label: "Enterprise Plan - $99.99", value: "Enterprise Plan" },
  ];

  const features = {
    free: ["Basic chat operations", "Up to 100 queries/month", "Email support"],
    paid: [
      "Advanced chat operations",
      "Unlimited queries/month",
      "Priority support",
      "Advanced analytics",
      "Custom integrations",
    ],
    "Free Plan": [
      "Advanced chat operations",
      "Up to 1,000 queries/month",
      "Priority email support",
      "Basic analytics",
    ],
    "Pro Plan": [
      "All basic features",
      "Up to 10,000 queries/month",
      "Phone support",
      "Advanced analytics",
      "Custom integrations",
    ],
    "Enterprise Plan": [
      "All pro features",
      "Unlimited queries",
      "Dedicated account manager",
      "Custom development",
      "SLA guarantee",
    ],
  };

  // Plan limits
  const planLimits = {
    "Free Plan": 100,
    "Pro Plan": 10000,
    "Enterprise Plan": -1, // unlimited
  };

  const currentLimit = planLimits[currentPlan as keyof typeof planLimits] || planLimits["Free Plan"];
  const usagePercent = currentLimit > 0 ? Math.round((loaderData.currentMonthUsage / currentLimit) * 100) : 0;
  const usageStatus = currentLimit > 0 && loaderData.currentMonthUsage > currentLimit ? "Exceeded" : "Within limit";

  const usageData = [
    [
      "Current Month Queries",
      currentLimit > 0 ? `${loaderData.currentMonthUsage} / ${currentLimit}` : `${loaderData.currentMonthUsage} / Unlimited`,
      usageStatus
    ],
    ["Usage Percentage", `${usagePercent}%`, usagePercent > 80 ? "High" : "Normal"],
    ["Plan", currentPlan, "Active"],
    ["Billing Cycle", "Monthly", "Active"],
  ];

  return (
    <Page>
      <TitleBar title="Subscription Management" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Current Subscription
                </Text>
                <InlineStack align="space-between">
                  <Text as="p" variant="bodyMd">
                    Plan:{" "}
                    <Badge
                      tone={currentPlan === "free" ? "warning" : "success"}
                    >
                      {loaderData.hasActivePayment
                        ? (loaderData.billing as any)?.payment?.name || "PAID"
                        : "FREE"}
                    </Badge>
                  </Text>
                  {currentPlan !== "free" && (
                    <Button
                      onClick={handleCancel}
                      loading={isLoading}
                      tone="critical"
                      variant="secondary"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </InlineStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Current Plan Features:
                  </Text>
                  {(
                    features[currentPlan as keyof typeof features] ||
                    features.free ||
                    []
                  ).map((feature, index) => (
                    <Text key={index} as="p" variant="bodyMd">
                      • {feature}
                    </Text>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Usage Statistics
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Metric", "Usage", "Status"]}
                  rows={usageData}
                />
              </BlockStack>
            </Card>

            {currentPlan === "free" && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Upgrade Your Plan
                  </Text>
                  <Text as="p" variant="bodyMd">
                    You've exceeded your free plan limits. Upgrade to continue
                    using advanced features.
                  </Text>

                  <Select
                    label="Choose a plan"
                    options={planOptions}
                    value={selectedPlan}
                    onChange={handlePlanChange}
                  />

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Selected Plan Features:
                    </Text>
                    {(
                      features[selectedPlan as keyof typeof features] ||
                      features["Free Plan"] ||
                      []
                    ).map((feature, index) => (
                      <Text key={index} as="p" variant="bodyMd">
                        • {feature}
                      </Text>
                    ))}
                  </BlockStack>

                  <InlineStack gap="300">
                    <Button
                      onClick={handleSubscribe}
                      loading={isLoading}
                      variant="primary"
                    >
                      Subscribe to {selectedPlan}
                    </Button>
                  </InlineStack>

                  {fetcher.data?.success && "message" in fetcher.data && (
                    <Text as="p" variant="bodyMd" tone="success">
                      {fetcher.data.message}
                    </Text>
                  )}
                  {fetcher.data &&
                    !fetcher.data.success &&
                    "error" in fetcher.data && (
                      <Text as="p" variant="bodyMd" tone="critical">
                        {fetcher.data.error}
                      </Text>
                    )}
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Billing Information
              </Text>
              <BlockStack gap="200">
                {loaderData.hasActivePayment ? (
                  <>
                    <Text as="p" variant="bodyMd">
                      <strong>Status:</strong> Active Subscription
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Billing:</strong> Active
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Test Mode:</strong> Yes
                    </Text>
                  </>
                ) : (
                  <Text as="p" variant="bodyMd">
                    No active subscription
                  </Text>
                )}
              </BlockStack>
              <Button variant="secondary" disabled>
                Update Billing Info
              </Button>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Support
              </Text>
              <Text as="p" variant="bodyMd">
                Need help with your subscription? Our support team is here to
                assist you.
              </Text>
              <Button variant="secondary" disabled>
                Contact Support
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
