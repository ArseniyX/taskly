import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Button,
  TextField,
  Text,
  Divider,
  BlockStack,
} from "@shopify/polaris";
import { ArrowUpIcon, PauseCircleIcon } from "@shopify/polaris-icons";

interface ChatMessage {
  id: string;
  message: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface ChatProps {
  userId?: string;
}

export function Chat({ userId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textFieldRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or on initial load
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        action: "messages",
        ...(userId && { userId }),
      });

      const response = await fetch(`/api/chat?${params}`);
      const data: any = await response.json();

      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMessageChange = useCallback(
    (value: string) => setNewMessage(value),
    [],
  );

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        message: newMessage,
        role: "user",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      const currentMessage = newMessage;
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

      if (response.ok) {
        const data = (await response.json()) as { response: string };

        const assistantMessageObj: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: data.response,
          role: "assistant",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessageObj]);
      } else {
        // Fallback response if API fails
        const assistantMessageObj: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message:
            "I'm having trouble processing your request. Please try again.",
          role: "assistant",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessageObj]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Fallback response on error
      const assistantMessageObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message:
          "I'm having trouble processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessageObj]);
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

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          Chat Messages
        </Text>

        <div
          ref={chatContainerRef}
          style={{
            height: "400px",
            overflowY: "auto",
            border: "1px solid #e1e3e5",
            borderRadius: "4px",
            padding: "12px",
          }}
        >
          <BlockStack gap="300">
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor:
                    message.role === "user" ? "#f0f8ff" : "#f5f5f5",
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "70%",
                }}
              >
                <Text variant="bodyMd" as="p">
                  <strong>
                    {message.role === "user" ? "You" : "Assistant"}:
                  </strong>{" "}
                  {message.message}
                </Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#f5f5f5",
                  alignSelf: "flex-start",
                  maxWidth: "70%",
                }}
              >
                <Text variant="bodyMd" as="p">
                  <strong>Assistant:</strong> Typing...
                </Text>
              </div>
            )}
          </BlockStack>
        </div>

        <Divider />

        <div style={{ position: "relative" }} ref={textFieldRef}>
          <TextField
            focused
            label=""
            labelHidden
            value={newMessage}
            onChange={handleMessageChange}
            placeholder="Ask me about your store data in natural language... (e.g., 'show me products with low inventory' or 'find recent orders')"
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
              onClick={sendMessage}
              loading={isLoading}
              disabled={!newMessage.trim()}
              variant="primary"
              size="micro"
              icon={isLoading ? PauseCircleIcon : ArrowUpIcon}
              accessibilityLabel={
                isLoading ? "Sending message" : "Send message"
              }
            />
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}
