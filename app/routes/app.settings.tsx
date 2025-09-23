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
  TextField,
  Select,
  Checkbox,
  FormLayout,
  Divider,
  Banner,
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

  if (intent === "save_settings") {
    return {
      success: true,
      message: "Settings saved successfully",
    };
  }

  if (intent === "reset_api_key") {
    return {
      success: true,
      message: "API key reset successfully",
      newApiKey: "app_key_" + Math.random().toString(36).substr(2, 16),
    };
  }

  return null;
};

export default function AppSettings() {
  const fetcher = useFetcher<typeof action>();
  const [appName, setAppName] = useState("My Store Assistant");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("America/New_York");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [autoResponses, setAutoResponses] = useState(true);
  const [dataRetention, setDataRetention] = useState("30");
  const [apiKey] = useState("app_key_abc123def456");

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  const handleSaveSettings = useCallback(() => {
    const settings = {
      appName,
      language,
      timezone,
      emailNotifications,
      pushNotifications,
      autoResponses,
      dataRetention,
    };

    fetcher.submit(
      { intent: "save_settings", ...settings },
      { method: "POST" }
    );
  }, [appName, language, timezone, emailNotifications, pushNotifications, autoResponses, dataRetention, fetcher]);

  const handleResetApiKey = useCallback(() => {
    fetcher.submit(
      { intent: "reset_api_key" },
      { method: "POST" }
    );
  }, [fetcher]);

  const languageOptions = [
    { label: "English", value: "en" },
    { label: "Spanish", value: "es" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Japanese", value: "ja" },
  ];

  const timezoneOptions = [
    { label: "Eastern Time (ET)", value: "America/New_York" },
    { label: "Central Time (CT)", value: "America/Chicago" },
    { label: "Mountain Time (MT)", value: "America/Denver" },
    { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
    { label: "UTC", value: "UTC" },
  ];

  const dataRetentionOptions = [
    { label: "7 days", value: "7" },
    { label: "30 days", value: "30" },
    { label: "90 days", value: "90" },
    { label: "1 year", value: "365" },
  ];

  return (
    <Page>
      <TitleBar title="App Settings" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {fetcher.data?.success && (
              <Banner title="Success" tone="success">
                {fetcher.data.message}
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  General Settings
                </Text>
                <FormLayout>
                  <TextField
                    label="App Name"
                    value={appName}
                    onChange={setAppName}
                    helpText="Customize how your app appears to users"
                  />

                  <Select
                    label="Language"
                    options={languageOptions}
                    value={language}
                    onChange={setLanguage}
                  />

                  <Select
                    label="Timezone"
                    options={timezoneOptions}
                    value={timezone}
                    onChange={setTimezone}
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Notifications
                </Text>
                <BlockStack gap="300">
                  <Checkbox
                    label="Email notifications"
                    helpText="Receive important updates via email"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                  <Checkbox
                    label="Push notifications"
                    helpText="Receive real-time notifications in your browser"
                    checked={pushNotifications}
                    onChange={setPushNotifications}
                  />
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Chat Settings
                </Text>
                <BlockStack gap="300">
                  <Checkbox
                    label="Enable auto-responses"
                    helpText="Automatically respond to common queries when you're offline"
                    checked={autoResponses}
                    onChange={setAutoResponses}
                  />

                  <Select
                    label="Data retention period"
                    options={dataRetentionOptions}
                    value={dataRetention}
                    onChange={setDataRetention}
                    helpText="How long to keep chat history and analytics data"
                  />
                </BlockStack>
              </BlockStack>
            </Card>

            <InlineStack gap="300">
              <Button
                onClick={handleSaveSettings}
                loading={isLoading}
                variant="primary"
              >
                Save Settings
              </Button>
              <Button variant="secondary" disabled>
                Reset to Defaults
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  API Configuration
                </Text>
                <Text as="p" variant="bodyMd">
                  Use this API key to integrate with external services.
                </Text>
                <TextField
                  label="API Key"
                  value={fetcher.data?.newApiKey || apiKey}
                  readOnly
                  connectedRight={
                    <Button onClick={handleResetApiKey} loading={isLoading}>
                      Reset
                    </Button>
                  }
                />
                <Text as="p" variant="bodySm" tone="subdued">
                  Keep your API key secure. Don't share it publicly.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  App Information
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    <strong>Version:</strong> 1.0.0
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Last Updated:</strong> November 2024
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Environment:</strong> Production
                  </Text>
                </BlockStack>
                <Divider />
                <Button variant="secondary" disabled>
                  View Changelog
                </Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Advanced
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Advanced configuration options for power users.
                </Text>
                <BlockStack gap="200">
                  <Button variant="secondary" disabled>
                    Export Data
                  </Button>
                  <Button variant="secondary" disabled>
                    Import Settings
                  </Button>
                  <Button tone="critical" variant="secondary" disabled>
                    Uninstall App
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}