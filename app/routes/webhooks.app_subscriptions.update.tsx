import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`, payload);

  try {
    const subscriptionData = payload as {
      id: number;
      name: string;
      status: string;
      created_at: string;
      updated_at: string;
      trial_days: number;
      trial_ends_on: string | null;
      app_recurring_pricing_details: {
        price: string;
        interval: string;
      };
    };

    // Store subscription information in database
    await db.subscription.upsert({
      where: { shop },
      update: {
        status: subscriptionData.status,
        shopifySubscriptionId: subscriptionData.id.toString(),
        planName: subscriptionData.name,
        trialEnd: subscriptionData.trial_ends_on ? new Date(subscriptionData.trial_ends_on) : null,
        canceledAt: subscriptionData.status === "cancelled" ? new Date() : null,
        updatedAt: new Date(),
      },
      create: {
        shop,
        planName: subscriptionData.name,
        status: subscriptionData.status,
        shopifySubscriptionId: subscriptionData.id.toString(),
        trialEnd: subscriptionData.trial_ends_on ? new Date(subscriptionData.trial_ends_on) : null,
        canceledAt: subscriptionData.status === "cancelled" ? new Date() : null,
        isTest: false, // Production webhooks
      },
    });

    console.log(`Subscription updated in database for shop ${shop}:`, {
      subscriptionId: subscriptionData.id,
      name: subscriptionData.name,
      status: subscriptionData.status,
      price: subscriptionData.app_recurring_pricing_details?.price,
      interval: subscriptionData.app_recurring_pricing_details?.interval,
    });

    console.log(`Successfully processed subscription update for shop: ${shop}`);
  } catch (error) {
    console.error(`Error processing subscription update for shop ${shop}:`, error);
  }

  return new Response();
};