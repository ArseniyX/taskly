import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { chatService } from "../services/chat.server";
import { AIQueryGeneratorService } from "../services/ai-query-generator.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const userId = url.searchParams.get("userId");

  try {
    switch (action) {
      case "conversations":
        const conversations = await chatService.getConversations(
          session.shop,
          userId || undefined,
        );
        return json({ conversations });

      case "messages":
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const messages = await chatService.getMessages(
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

        const savedMessage = await chatService.saveMessage({
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

        const conversation = await chatService.createConversation({
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

        const conversation = await chatService.updateConversation(
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

        await chatService.deleteConversation(conversationId, session.shop);
        return json({ success: true });
      }

      case "process_message": {
        const message = formData.get("message")?.toString();
        const userId = formData.get("userId")?.toString();

        if (!message) {
          return json(
            { error: "Message is required" },
            { status: 400 },
          );
        }

        // 1. Save user message
        await chatService.saveMessage({
          shop: session.shop,
          userId: userId || undefined,
          message,
          role: "user",
        });

        // 2. Identify intent and generate AI response
        const aiService = new AIQueryGeneratorService();
        const intent = aiService.identifyIntent(message);

        let assistantResponse = "";

        switch (intent) {
          case "query": {
            // Execute query flow
            const result = await aiService.generateGraphQLQuery(admin, message);
            assistantResponse = result.summary || "Here are your store results.";
            break;
          }
          case "mutation": {
            // For now, mutations are not implemented, just acknowledge
            assistantResponse = "I understand you want to make changes to your store. Mutation operations are coming soon!";
            break;
          }
          case "message": {
            // Generate simple conversational response
            assistantResponse = "I can help you with your store operations. Try asking me specific questions about your products, orders, customers, or other store data!";
            break;
          }
          default: {
            assistantResponse = "I'm not sure what you're looking for. Try asking me about your products, orders, or customers.";
            break;
          }
        }

        // 3. Save assistant response
        const savedResponse = await chatService.saveMessage({
          shop: session.shop,
          userId: userId || undefined,
          message: assistantResponse,
          role: "assistant",
        });

        return json({
          response: assistantResponse,
          message: savedResponse,
          intent
        });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
