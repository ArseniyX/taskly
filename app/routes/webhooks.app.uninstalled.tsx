import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Clean up all data for this shop
    await db.$transaction([
      // Delete chat messages
      db.chatMessage.deleteMany({ where: { shop } }),
      // Delete chat conversations
      db.chatConversation.deleteMany({ where: { shop } }),
      // Delete sessions
      db.session.deleteMany({ where: { shop } })
    ]);

    console.log(`Successfully cleaned up data for shop: ${shop}`);
  } catch (error) {
    console.error(`Error cleaning up data for shop ${shop}:`, error);
  }

  return new Response();
};
