import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { usageService } from "../services/usage.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get current subscription status
  const currentUsage = await usageService.checkUsageLimit(session.shop);

  return {
    shop: session.shop,
    currentPlan: currentUsage.planName,
    currentUsage: currentUsage.currentUsage,
    limit: currentUsage.limit,
  } as const;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const planName = formData.get("planName");

  if (intent === "upgrade_plan") {
    // Here you would integrate with Shopify billing API
    // For now, we'll just update the subscription in our database

    console.log(`Upgrading ${session.shop} to ${planName}`);

    // TODO: Implement actual billing integration
    return {
      success: true,
      message: `Successfully upgraded to ${planName}!`,
    } as const;
  }

  return {
    success: false,
    message: "Unknown action",
  } as const;
};

export default function Subscription() {
  const { currentPlan, currentUsage, limit } = useLoaderData() as {
    shop: string;
    currentPlan: string;
    currentUsage: number;
    limit: number;
  };
  const fetcher = useFetcher();
  const [billingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Free Plan",
      price: { monthly: 0, annual: 0 },
      description: "Perfect for getting started with basic store operations.",
      features: [
        "20 AI queries per month",
        "Basic chat support",
        "Store data insights",
        "Email support",
      ],
      limitations: ["Limited AI queries", "Basic features only"],
      buttonText: currentPlan === "Free Plan" ? "Current" : "Downgrade",
      disabled: currentPlan === "Free Plan",
      popular: false,
    },
    {
      name: "Pro Plan",
      price: { monthly: 39, annual: 390 }, // $32.50/month when billed annually
      description:
        "For growing businesses that need more power and flexibility.",
      features: [
        "10,000 AI queries per month",
        "Advanced analytics",
        "Priority chat support",
        "Custom integrations",
        "Advanced reporting",
        "API access",
      ],
      limitations: [],
      buttonText:
        currentPlan === "Pro Plan" ? "Current" : "Start your 5 day free trial",
      disabled: currentPlan === "Pro Plan",
      popular: true,
    },
    {
      name: "Enterprise Plan",
      price: { monthly: 99, annual: 990 }, // $82.50/month when billed annually
      description:
        "For large businesses with advanced needs and unlimited usage.",
      features: [
        "Unlimited AI queries",
        "White-label options",
        "Dedicated account manager",
        "Custom development",
        "Advanced security",
        "SLA guarantee",
        "Phone support",
      ],
      limitations: [],
      buttonText:
        currentPlan === "Enterprise Plan"
          ? "Current"
          : "Start your 5 day free trial",
      disabled: currentPlan === "Enterprise Plan",
      popular: false,
    },
  ];

  const handleUpgrade = (planName: string) => {
    fetcher.submit({ intent: "upgrade_plan", planName }, { method: "POST" });
  };

  return (
    <Page>
      <TitleBar title="Subscription Plans" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            {/* Header */}
            <BlockStack gap="200">
              <Text as="h1" variant="headingLg">
                Plans
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Choose the best plan for you. Upgrade as you grow.
              </Text>
            </BlockStack>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Current Usage
                </Text>
                <InlineStack gap="400">
                  <Text as="span" variant="bodyMd">
                    <strong>Plan:</strong> {currentPlan}
                  </Text>
                  <Text as="span" variant="bodyMd">
                    <strong>Usage:</strong> {currentUsage}/
                    {limit === -1 ? "∞" : limit} queries this month
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* @ts-ignore */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
              }}
            >
              {plans.map((plan) => (
                <Card key={plan.name} padding="500">
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <BlockStack gap="400">
                      {/* Plan Header */}
                      <BlockStack gap="200">
                        <InlineStack gap="200" align="space-between">
                          <Text as="h3" variant="headingMd">
                            {plan.name}
                          </Text>
                          {plan.popular && (
                            <Badge tone="info">Most Popular</Badge>
                          )}
                        </InlineStack>

                        <InlineStack gap="100" blockAlign="end">
                          <Text as="span" variant="heading2xl">
                            ${plan.price[billingCycle]}
                          </Text>
                          <Text as="span" variant="bodyMd" tone="subdued">
                            /{billingCycle === "monthly" ? "month" : "year"}
                          </Text>
                        </InlineStack>

                        <Text as="p" variant="bodyMd" tone="subdued">
                          {plan.description}
                        </Text>
                      </BlockStack>

                      {/* CTA Button */}
                      <Button
                        variant={"primary"}
                        fullWidth
                        disabled={plan.disabled}
                        loading={fetcher.state === "submitting"}
                        onClick={() => handleUpgrade(plan.name)}
                      >
                        {plan.buttonText}
                      </Button>

                      <Divider />

                      {/* Features */}
                      <BlockStack gap="200">
                        <Text as="h4" variant="bodyMd" fontWeight="semibold">
                          FEATURES
                        </Text>
                        <BlockStack gap="100">
                          {plan.features.map((feature) => (
                            <InlineStack key={feature} gap="200">
                              <Text as="span" variant="bodyMd" tone="success">
                                ✓
                              </Text>
                              <Text as="span" variant="bodyMd">
                                {feature}
                              </Text>
                            </InlineStack>
                          ))}
                          {plan.limitations.map((limitation) => (
                            <InlineStack key={limitation} gap="200">
                              <Text as="span" variant="bodyMd" tone="critical">
                                ✗
                              </Text>
                              <Text as="span" variant="bodyMd" tone="subdued">
                                {limitation}
                              </Text>
                            </InlineStack>
                          ))}
                        </BlockStack>
                      </BlockStack>
                    </BlockStack>
                  </div>
                </Card>
              ))}
            </div>

            {/* Success/Error Message */}
            {fetcher.data &&
              typeof fetcher.data === "object" &&
              fetcher.data !== null &&
              "success" in fetcher.data &&
              "message" in fetcher.data && (
                <Card>
                  <Text
                    as="p"
                    variant="bodyMd"
                    tone={
                      (fetcher.data as { success: boolean }).success
                        ? "success"
                        : "critical"
                    }
                  >
                    {(fetcher.data as { message: string }).message}
                  </Text>
                </Card>
              )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
