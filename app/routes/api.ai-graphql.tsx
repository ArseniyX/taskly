import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { aiQueryGenerator } from "../services/ai-query-generator.server";
import { chatService } from "../services/chat.server";

/**
 * AI-Powered GraphQL API using OpenAI
 * Uses AI SDK with OpenAI for intelligent query generation and schema introspection
 */

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const message = formData.get("message") as string;
    const conversationId = formData.get("conversationId") as string;

    if (action === "generate_graphql") {
      try {
        // Use AI to generate optimized GraphQL query
        const {
          query: generatedQuery,
          variables,
          explanation,
          analysis
        } = await aiQueryGenerator.generateGraphQLQuery(admin as any, message);

        // Execute the query
        let executionResult = null;
        let hasErrors = false;

        try {
          const response = await admin.graphql(generatedQuery, { variables });
          executionResult = await response.json();
          hasErrors = Boolean(executionResult.errors);
        } catch (error) {
          console.error('Query execution failed:', error);
          executionResult = {
            errors: [{ message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }]
          };
          hasErrors = true;
        }

        // Save conversation
        await chatService.saveMessage({
          shop: session.shop,
          message,
          role: "user",
          metadata: {
            conversationId,
            type: "ai_graphql_generation",
            operation: analysis.operation,
            analysis
          }
        });

        const assistantMessage = formatAIResponse(message, explanation, executionResult, analysis);

        await chatService.saveMessage({
          shop: session.shop,
          message: assistantMessage,
          role: "assistant",
          metadata: {
            conversationId,
            type: "ai_graphql_response",
            generatedQuery,
            operation: analysis.operation,
            analysis,
            executionResult: hasErrors ? null : executionResult,
            hasErrors
          }
        });

        return json({
          success: true,
          data: {
            generatedQuery,
            variables,
            explanation,
            analysis,
            executionResult,
            assistantMessage,
            hasErrors
          }
        });

      } catch (error) {
        console.error('AI GraphQL generation failed:', error);
        return json({
          success: false,
          error: `AI query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
    }

    if (action === "get_schema_info") {
      const typeName = formData.get("typeName") as string;

      try {
        // This action is kept for potential future use with the AI system
        return json({
          success: true,
          data: {
            message: "Schema info is now handled automatically by AI analysis"
          }
        });
      } catch (error) {
        return json({
          success: false,
          error: `Failed to get schema info: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
    }

    return json({
      success: false,
      error: "Unknown action"
    }, { status: 400 });

  } catch (error) {
    console.error('Simple AI GraphQL API error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

/**
 * Format AI-generated response message for the user
 */
function formatAIResponse(
  originalMessage: string,
  aiExplanation: string,
  executionResult: any,
  analysis: any
): string {
  let response = `${aiExplanation}\n\n`;

  if (executionResult?.errors) {
    response += `**❌ Query Error:**\n`;
    executionResult.errors.forEach((error: any) => {
      response += `• ${error.message}\n`;
    });
    response += `\nLet me try a different approach for you.`;
  } else if (executionResult?.data) {
    const data = executionResult.data;
    const key = Object.keys(data)[0];

    if (data[key]?.edges) {
      const count = data[key].edges.length;
      const hasMore = data[key].pageInfo?.hasNextPage;
      const operation = analysis.operation;

      response += `**✅ Found ${count} ${operation}**${hasMore ? ' (showing first results)' : ''}\n\n`;

      // Show detailed examples based on AI analysis
      data[key].edges.slice(0, 3).forEach((edge: any, index: number) => {
        const item = edge.node;
        response += `${index + 1}. **${item.title || item.name || item.displayName || `${operation.slice(0, -1)} ${item.id.split('/').pop()}`}**`;

        // Add relevant details based on operation type
        if (operation === 'products') {
          if (item.status) response += ` (${item.status})`;
          if (item.totalInventory !== undefined) response += ` - Stock: ${item.totalInventory}`;
          if (item.vendor) response += ` - by ${item.vendor}`;
          if (item.variants?.edges?.length > 0) {
            const firstVariant = item.variants.edges[0].node;
            response += ` - from $${firstVariant.price}`;
          }
        } else if (operation === 'orders') {
          if (item.totalPriceSet?.shopMoney) {
            response += ` - ${item.totalPriceSet.shopMoney.amount} ${item.totalPriceSet.shopMoney.currencyCode}`;
          }
          if (item.displayFinancialStatus) response += ` (${item.displayFinancialStatus})`;
          if (item.customer?.displayName) response += ` - ${item.customer.displayName}`;
        } else if (operation === 'customers') {
          if (item.email) response += ` - ${item.email}`;
          if (item.phone) response += ` - ${item.phone}`;
        }

        if (item.createdAt) {
          const date = new Date(item.createdAt).toLocaleDateString();
          response += ` - Created: ${date}`;
        }

        response += '\n';
      });

      if (count > 3) {
        response += `\n...and ${count - 3} more results.`;
      }
    } else {
      response += `**✅ Query executed successfully!**\n\nData retrieved from your store.`;
    }

    // Add insights based on AI analysis
    if (analysis.filters?.length > 0) {
      response += `\n\n*Applied filters: ${analysis.filters.map((f: any) => `${f.field} ${f.operator} ${f.value}`).join(', ')}*`;
    }
  }

  return response;
}