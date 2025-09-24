import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { Chat } from "../components/Chat";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function AppChat() {
  return (
    <Page>
      <TitleBar title="Chat" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Chat />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
