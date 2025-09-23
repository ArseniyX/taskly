import { useState, useEffect } from "react";
import { Card, Button, TextField, Box, Text, Divider, BlockStack } from "@shopify/polaris";

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

  useEffect(() => {
    loadMessages();
  }, [userId]);

  const loadMessages = async () => {
    try {
      const params = new URLSearchParams({
        action: "messages",
        ...(userId && { userId }),
      });

      const response = await fetch(`/api/chat?${params}`);
      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Save user message
      const formData = new FormData();
      formData.append("action", "save_message");
      formData.append("message", newMessage);
      formData.append("role", "user");
      if (userId) formData.append("userId", userId);

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          message: newMessage,
          role: "user",
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage("");

        // Simulate assistant response (you can integrate with actual AI service here)
        setTimeout(async () => {
          const assistantMessage = `Thanks for your message: "${newMessage}". This is a placeholder response.`;

          const assistantFormData = new FormData();
          assistantFormData.append("action", "save_message");
          assistantFormData.append("message", assistantMessage);
          assistantFormData.append("role", "assistant");
          if (userId) assistantFormData.append("userId", userId);

          await fetch("/api/chat", {
            method: "POST",
            body: assistantFormData,
          });

          const assistantMessageObj: ChatMessage = {
            id: (Date.now() + 1).toString(),
            message: assistantMessage,
            role: "assistant",
            timestamp: new Date().toISOString(),
          };

          setMessages(prev => [...prev, assistantMessageObj]);
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsLoading(false);
    }
  };


  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          Chat Messages
        </Text>

        <div
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
                  backgroundColor: message.role === "user" ? "#f0f8ff" : "#f5f5f5",
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "70%",
                }}
              >
                <Text variant="bodyMd" as="p">
                  <strong>{message.role === "user" ? "You" : "Assistant"}:</strong> {message.message}
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

        <BlockStack gap="200">
          <TextField
            label=""
            value={newMessage}
            onChange={setNewMessage}
            placeholder="Type your message..."
            multiline={3}
            autoComplete="off"
          />
          <Button
            variant="primary"
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
          >
            {isLoading ? "Sending..." : "Send Message"}
          </Button>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}