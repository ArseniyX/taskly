import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  TextField,
  InlineStack,
  Divider,
  Badge,
} from "@shopify/polaris";
import { ArrowUpIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { chatService } from "../services/chat.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const conversations = await chatService.getConversations(session.shop);
    const latestConversation = conversations[0];
    const messages = latestConversation
      ? await chatService.getMessages(session.shop, undefined, 50)
      : [];

    return {
      conversations,
      messages,
      currentConversationId: latestConversation?.id,
    };
  } catch (error) {
    console.error("Failed to load chat data:", error);
    return {
      conversations: [],
      messages: [],
      currentConversationId: null,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const query = formData.get("query") as string;
  const conversationId = formData.get("conversationId") as string;
  const message = formData.get("message") as string;

  if (intent === "search_products") {
    const response = await admin.graphql(
      `#graphql
        query getProducts($first: Int!, $query: String) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                title
                handle
                status
                totalInventory
                createdAt
              }
            }
          }
        }`,
      {
        variables: {
          first: 10,
          query: query || null,
        },
      },
    );
    const responseJson = await response.json();
    return {
      products: responseJson.data.products.edges,
      intent: "search_products",
    };
  }

  if (intent === "get_orders") {
    const response = await admin.graphql(
      `#graphql
        query getOrders($first: Int!) {
          orders(first: $first) {
            edges {
              node {
                id
                name
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                displayFinancialStatus
                fulfillmentStatus
                createdAt
              }
            }
          }
        }`,
      {
        variables: {
          first: 10,
        },
      },
    );
    const responseJson = await response.json();
    return { orders: responseJson.data.orders.edges, intent: "get_orders" };
  }

  if (intent === "send_message") {
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const newConversation = await chatService.createConversation({
        shop: session.shop,
        title: "Store Operations Chat",
        metadata: { type: "operations_chat" },
      });
      currentConversationId = newConversation.id;
    }

    await chatService.saveMessage({
      shop: session.shop,
      message,
      role: "user",
      metadata: { conversationId: currentConversationId },
    });

    let assistantResponse =
      "I can help you with your store operations. Try asking me to 'search products' or 'show orders'.";
    let responseData = null;

    if (
      message.toLowerCase().includes("product") &&
      message.toLowerCase().includes("search")
    ) {
      const searchTerm = message
        .replace(/search|product|for|find/gi, "")
        .trim();
      const response = await admin.graphql(
        `#graphql
          query getProducts($first: Int!, $query: String) {
            products(first: $first, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  totalInventory
                  createdAt
                }
              }
            }
          }`,
        {
          variables: {
            first: 10,
            query: searchTerm || null,
          },
        },
      );
      const responseJson = await response.json();
      responseData = responseJson.data.products.edges;
      assistantResponse = `Found ${responseData.length} products for "${searchTerm}":`;
    } else if (message.toLowerCase().includes("order")) {
      const response = await admin.graphql(
        `#graphql
          query getOrders($first: Int!) {
            orders(first: $first) {
              edges {
                node {
                  id
                  name
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  displayFinancialStatus
                  fulfillmentStatus
                  createdAt
                }
              }
            }
          }`,
        {
          variables: {
            first: 10,
          },
        },
      );
      const responseJson = await response.json();
      responseData = responseJson.data.orders.edges;
      assistantResponse = `Found ${responseData.length} recent orders:`;
    }

    await chatService.saveMessage({
      shop: session.shop,
      message: assistantResponse,
      role: "assistant",
      metadata: {
        conversationId: currentConversationId,
        data: responseData,
      },
    });

    return {
      intent: "send_message",
      conversationId: currentConversationId,
      assistantResponse,
      data: responseData,
    };
  }

  return null;
};

export default function ChatOperations() {
  const fetcher = useFetcher<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    loaderData.currentConversationId || null,
  );
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: "user" | "assistant"; content: string; data?: any }>
  >([]);
  const textFieldRef = useRef<HTMLDivElement>(null);

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (loaderData.messages && loaderData.messages.length > 0) {
      const formattedMessages = loaderData.messages.map((msg: any) => ({
        type: msg.role as "user" | "assistant",
        content: msg.message,
        data: msg.metadata?.data || null,
      }));
      setChatHistory(formattedMessages);
    }
  }, [loaderData.messages]);

  const handleMessageChange = useCallback(
    (value: string) => setMessage(value),
    [],
  );

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setChatHistory((prev) => [...prev, { type: "user", content: userMessage }]);
    setMessage("");

    fetcher.submit(
      {
        intent: "send_message",
        message: userMessage,
        conversationId: conversationId || "",
      },
      { method: "POST" },
    );
  }, [message, fetcher, conversationId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    };

    const textField = textFieldRef.current;
    if (textField) {
      const textarea = textField.querySelector("textarea");
      if (textarea) {
        textarea.addEventListener("keydown", handleKeyDown);
        return () => {
          textarea.removeEventListener("keydown", handleKeyDown);
        };
      }
    }
  }, [handleSendMessage]);

  useEffect(() => {
    if (
      fetcher.data &&
      "intent" in fetcher.data &&
      fetcher.data.intent === "send_message"
    ) {
      const data = fetcher.data as any;
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      setChatHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: data.assistantResponse,
          data: data.data,
        },
      ]);
    }
  }, [fetcher.data, conversationId]);

  return (
    <Page>
      <TitleBar title="Chat Operations" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Store Operations Chat
              </Text>
              <Text variant="bodyMd" as="p">
                Ask me about your store operations. I can help you search
                products, view orders, and manage your store.
              </Text>

              <div
                style={{
                  height: "400px",
                  overflowY: "auto",
                  border: "1px solid #e1e3e5",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <BlockStack gap="300">
                  {chatHistory.map((msg, index) => (
                    <div key={index}>
                      <InlineStack align="start" gap="200">
                        <Badge tone={msg.type === "user" ? "info" : "success"}>
                          {msg.type === "user" ? "You" : "Assistant"}
                        </Badge>
                        <Text as="p" variant="bodyMd">
                          {msg.content}
                        </Text>
                      </InlineStack>

                      {msg.data && Array.isArray(msg.data) && (
                        <div style={{ marginTop: "8px", marginLeft: "60px" }}>
                          <BlockStack gap="200">
                            {msg.data
                              .slice(0, 5)
                              .map((item: any, idx: number) => (
                                <Card key={idx} padding="200">
                                  {item.node.title && (
                                    <BlockStack gap="100">
                                      <Text
                                        as="p"
                                        variant="bodySm"
                                        fontWeight="semibold"
                                      >
                                        {item.node.title}
                                      </Text>
                                      {item.node.status && (
                                        <Badge>{item.node.status}</Badge>
                                      )}
                                      {item.node.totalInventory !==
                                        undefined && (
                                        <Text as="p" variant="bodySm">
                                          Inventory: {item.node.totalInventory}
                                        </Text>
                                      )}
                                    </BlockStack>
                                  )}
                                  {item.node.name && (
                                    <BlockStack gap="100">
                                      <Text
                                        as="p"
                                        variant="bodySm"
                                        fontWeight="semibold"
                                      >
                                        {item.node.name}
                                      </Text>
                                      {item.node.totalPriceSet && (
                                        <Text as="p" variant="bodySm">
                                          {
                                            item.node.totalPriceSet.shopMoney
                                              .amount
                                          }{" "}
                                          {
                                            item.node.totalPriceSet.shopMoney
                                              .currencyCode
                                          }
                                        </Text>
                                      )}
                                      {item.node.displayFinancialStatus && (
                                        <Badge>
                                          {item.node.displayFinancialStatus}
                                        </Badge>
                                      )}
                                    </BlockStack>
                                  )}
                                </Card>
                              ))}
                          </BlockStack>
                        </div>
                      )}

                      {index < chatHistory.length - 1 && <Divider />}
                    </div>
                  ))}
                  {isLoading && (
                    <InlineStack align="start" gap="200">
                      <Badge tone="attention">Assistant</Badge>
                      <Text as="p" variant="bodyMd">
                        Processing your request...
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </div>

              <div style={{ position: "relative" }} ref={textFieldRef}>
                <TextField
                  focused
                  label=""
                  labelHidden
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Ask me about your store... (e.g., 'search products' or 'show orders')"
                  disabled={isLoading}
                  autoComplete="off"
                  multiline={3}
                  maxHeight="120px"
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    zIndex: 100,
                  }}
                >
                  <Button
                    onClick={handleSendMessage}
                    loading={isLoading}
                    disabled={!message.trim()}
                    variant="primary"
                    size="micro"
                    icon={ArrowUpIcon}
                    accessibilityLabel="Send message"
                  />
                </div>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
