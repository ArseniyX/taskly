import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Button,
  TextField,
  Text,
  Divider,
  BlockStack,
  Banner,
  Spinner,
} from "@shopify/polaris";
import { ArrowUpIcon, PauseCircleIcon } from "@shopify/polaris-icons";

interface ChatMessage {
  id: string;
  message: string;
  role: "user" | "assistant";
  timestamp: string;
  metadata?: any;
}

interface ChatProps {
  userId?: string;
}

interface ChatResponse {
  response: string;
  intent?: string;
  error?: string;
}

export function Chat({ userId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const textFieldRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or on initial load
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-focus input when component mounts
  useEffect(() => {
    const focusInput = () => {
      const textarea = textFieldRef.current?.querySelector("textarea");
      if (textarea) {
        textarea.focus();
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(focusInput, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        action: "messages",
        ...(userId && { userId }),
      });

      const response = await fetch(`/api/chat?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as { messages?: ChatMessage[], error?: string };

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.messages) {
        // Sort messages by timestamp to ensure proper order
        const sortedMessages = data.messages.sort((a: ChatMessage, b: ChatMessage) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError(error instanceof Error ? error.message : "Failed to load chat history");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMessageChange = useCallback(
    (value: string) => {
      setNewMessage(value);
      setError(null); // Clear any previous errors
    },
    [],
  );

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Add user message to UI immediately with timestamp
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        message: newMessage.trim(),
        role: "user",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      const currentMessage = newMessage.trim();
      setNewMessage("");

      // Process message with AI
      const formData = new FormData();
      formData.append("action", "process_message");
      formData.append("message", currentMessage);
      if (userId) formData.append("userId", userId);

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add assistant response to UI
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        message: data.response,
        role: "assistant",
        timestamp: new Date().toISOString(),
        metadata: { intent: data.intent }
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Failed to send message:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);

      // Add error message to chat
      const assistantMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        message: "I'm having trouble processing your request. Please try again or contact support if the issue persists.",
        role: "assistant",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, isLoading, userId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
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
  }, [sendMessage]);

  const formatMessage = (message: string) => {
    // Simple markdown-like formatting for bold text
    return message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  if (isLoadingMessages) {
    return (
      <Card>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <Spinner size="large" />
          <Text variant="bodyMd" as="p" tone="subdued">
            Loading chat history...
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          AI Chat Assistant
        </Text>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            <p>{error}</p>
          </Banner>
        )}

        <div
          ref={chatContainerRef}
          style={{
            height: "500px",
            overflowY: "auto",
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "16px",
            backgroundColor: "#fafbfc",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Text variant="bodyLg" as="p" tone="subdued">
                Welcome! Ask me anything about your store data.
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Try: "Show me my products" or "How many orders do I have?"
              </Text>
            </div>
          ) : (
            <BlockStack gap="300">
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    flexDirection: message.role === "user" ? "row-reverse" : "row",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      backgroundColor: message.role === "user" ? "#2c5aa0" : "#ffffff",
                      color: message.role === "user" ? "white" : "#202223",
                      maxWidth: "75%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      border: message.role === "assistant" ? "1px solid #e1e3e5" : "none",
                    }}
                  >
                    <Text
                      variant="bodyMd"
                      as="p"
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(message.message)
                        }}
                      />
                    </Text>
                    <Text
                      variant="bodySm"
                      as="p"
                      tone={message.role === "user" ? undefined : "subdued"}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      maxWidth: "75%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      border: "1px solid #e1e3e5",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <Spinner size="small" />
                    <Text variant="bodyMd" as="p">
                      Processing your request...
                    </Text>
                  </div>
                </div>
              )}
            </BlockStack>
          )}
        </div>

        <Divider />

        <div style={{ position: "relative" }} ref={textFieldRef}>
          <TextField
            label=""
            labelHidden
            value={newMessage}
            onChange={handleMessageChange}
            placeholder="Ask me about your store... (e.g., 'show me recent orders', 'find products with low inventory')"
            disabled={isLoading}
            autoComplete="off"
            multiline={3}
            maxHeight="120px"
          />
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              zIndex: 100,
            }}
          >
            <Button
              onClick={sendMessage}
              loading={isLoading}
              disabled={!newMessage.trim() || isLoading}
              variant="primary"
              size="micro"
              icon={isLoading ? PauseCircleIcon : ArrowUpIcon}
              accessibilityLabel={
                isLoading ? "Processing message" : "Send message"
              }
            />
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}

export default Chat;