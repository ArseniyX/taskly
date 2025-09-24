import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { chatController } from "../modules/chat";
import { aiService } from "../modules/ai";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const userId = url.searchParams.get("userId");

  try {
    switch (action) {
      case "conversations":
        const conversations = await chatController.getConversations(
          session.shop,
          userId || undefined,
        );
        return json({ conversations });

      case "messages":
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const messages = await chatController.getMessages(
          session.shop,
          userId || undefined,
          limit,
        );
        return json({ messages });

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action")?.toString();

  try {
    switch (action) {
      case "save_message": {
        const message = formData.get("message")?.toString();
        const role = formData.get("role")?.toString() as "user" | "assistant";
        const userId = formData.get("userId")?.toString();
        const metadata = formData.get("metadata")?.toString();

        if (!message || !role) {
          return json(
            { error: "Message and role are required" },
            { status: 400 },
          );
        }

        const savedMessage = await chatController.saveMessage({
          shop: session.shop,
          userId: userId || undefined,
          message,
          role,
          metadata: metadata ? JSON.parse(metadata) : undefined,
        });

        return json({ message: savedMessage });
      }

      case "create_conversation": {
        const title = formData.get("title")?.toString();
        const userId = formData.get("userId")?.toString();
        const metadata = formData.get("metadata")?.toString();

        const conversation = await chatController.createConversation({
          shop: session.shop,
          userId: userId || undefined,
          title,
          metadata: metadata ? JSON.parse(metadata) : undefined,
        });

        return json({ conversation });
      }

      case "update_conversation": {
        const conversationId = formData.get("conversationId")?.toString();
        const title = formData.get("title")?.toString();
        const metadata = formData.get("metadata")?.toString();

        if (!conversationId) {
          return json(
            { error: "Conversation ID is required" },
            { status: 400 },
          );
        }

        const conversation = await chatController.updateConversation(
          conversationId,
          session.shop,
          {
            title,
            metadata: metadata ? JSON.parse(metadata) : undefined,
          },
        );

        return json({ conversation });
      }

      case "delete_conversation": {
        const conversationId = formData.get("conversationId")?.toString();

        if (!conversationId) {
          return json(
            { error: "Conversation ID is required" },
            { status: 400 },
          );
        }

        await chatController.deleteConversation(conversationId, session.shop);
        return json({ success: true });
      }

      case "process_message": {
        const message = formData.get("message")?.toString();
        const userId = formData.get("userId")?.toString();

        if (!message) {
          return json({ error: "Message is required" }, { status: 400 });
        }

        try {
          // 1. Save user message
          await chatController.saveMessage({
            shop: session.shop,
            userId: userId || undefined,
            message,
            role: "user",
          });

          // 2. Process message with unified AI service
          const result = await aiService.processMessage(admin as any, message);

          // 3. Save assistant response with metadata
          const savedResponse = await chatController.saveMessage({
            shop: session.shop,
            userId: userId || undefined,
            message: result.summary,
            role: "assistant",
            metadata: {
              intent: result.intent,
              query: result.query,
              executionResult: result.executionResult,
            },
          });

          return json({
            response: result.summary,
            message: savedResponse,
            intent: result.intent,
            query: result.query,
          });
        } catch (error) {
          console.error("Error processing message:", error);

          // Save error response
          const errorResponse =
            error instanceof Error && error.message.includes("Usage limit")
              ? error.message
              : "I'm having trouble processing your request. Please try again.";

          const savedResponse = await chatController.saveMessage({
            shop: session.shop,
            userId: userId || undefined,
            message: errorResponse,
            role: "assistant",
          });

          return json({
            response: errorResponse,
            message: savedResponse,
            intent: "error",
          });
        }
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
