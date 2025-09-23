import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
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
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const planId = formData.get("planId") as string;

  if (intent === "subscribe") {
    return {
      success: true,
      message: `Successfully subscribed to ${planId} plan`,
      planId,
    };
  }

  if (intent === "cancel") {
    return {
      success: true,
      message: "Subscription cancelled successfully",
    };
  }

  return null;
};

export default function SubscriptionManagement() {
  const fetcher = useFetcher<typeof action>();
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [currentPlan] = useState("free");

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  const handlePlanChange = useCallback((value: string) => {
    setSelectedPlan(value);
  }, []);

  const handleSubscribe = useCallback(() => {
    fetcher.submit(
      { intent: "subscribe", planId: selectedPlan },
      { method: "POST" }
    );
  }, [selectedPlan, fetcher]);

  const handleCancel = useCallback(() => {
    fetcher.submit(
      { intent: "cancel" },
      { method: "POST" }
    );
  }, [fetcher]);

  const planOptions = [
    { label: "Basic Plan - $9.99/month", value: "basic" },
    { label: "Pro Plan - $29.99/month", value: "pro" },
    { label: "Enterprise Plan - $99.99/month", value: "enterprise" },
  ];

  const features = {
    free: ["Basic chat operations", "Up to 100 queries/month", "Email support"],
    basic: ["Advanced chat operations", "Up to 1,000 queries/month", "Priority email support", "Basic analytics"],
    pro: ["All basic features", "Up to 10,000 queries/month", "Phone support", "Advanced analytics", "Custom integrations"],
    enterprise: ["All pro features", "Unlimited queries", "Dedicated account manager", "Custom development", "SLA guarantee"],
  };

  const usageData = [
    ["Current Month Queries", "245 / 100", "Exceeded"],
    ["Last Month", "89 / 100", "Within limit"],
    ["Average Daily Usage", "8.2 queries", "Normal"],
    ["Peak Usage Day", "23 queries", "Nov 15"],
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
                    Plan: <Badge tone={currentPlan === "free" ? "warning" : "success"}>{currentPlan.toUpperCase()}</Badge>
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
                  {features[currentPlan as keyof typeof features].map((feature, index) => (
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
                    You've exceeded your free plan limits. Upgrade to continue using advanced features.
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
                    {features[selectedPlan as keyof typeof features].map((feature, index) => (
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
                      Subscribe to {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
                    </Button>
                  </InlineStack>

                  {fetcher.data?.success && (
                    <Text as="p" variant="bodyMd" tone="success">
                      {fetcher.data.message}
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
                <Text as="p" variant="bodyMd">
                  <strong>Next Billing Date:</strong> December 15, 2024
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Payment Method:</strong> •••• •••• •••• 1234
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Billing Email:</strong> user@example.com
                </Text>
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
                Need help with your subscription? Our support team is here to assist you.
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