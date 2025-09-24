# AI-Powered GraphQL Chat System for Shopify Apps

This implementation adds AI-powered GraphQL generation and execution to your Shopify app's chat functionality using OpenAI and the Vercel AI SDK. Users can ask questions in natural language, and the system will intelligently generate and execute optimized GraphQL queries.

## Features

- **🤖 AI-Powered Query Generation**: Uses OpenAI GPT-4 to understand user intent and generate optimized GraphQL queries
- **🧠 Intelligent Field Selection**: AI selects the most relevant fields based on user query context
- **📊 Smart Filtering & Sorting**: Automatically applies filters and sorting based on natural language input
- **🔍 Schema Introspection**: Direct GraphQL introspection for real-time schema information
- **⚡ Real-time Execution**: Execute queries and display results in the chat interface
- **📱 Visual Query Display**: Show generated GraphQL queries with collapsible code blocks
- **🎯 Context-Aware Responses**: AI generates human-readable explanations for each query

## Key Components

### 1. AI Query Generator Service (`app/services/ai-query-generator.server.ts`)
- **OpenAI Integration**: Uses GPT-4 for intelligent query analysis
- **Structured Output**: Generates validated JSON schemas with zod
- **Smart Field Selection**: AI-driven field selection based on query context
- **Advanced Query Building**: Creates complex queries with nested fields and filters

### 2. GraphQL Introspection Service (`app/services/graphql-introspection.server.ts`)
- **Direct Schema Access**: Uses GraphQL introspection without external dependencies
- **Performance Caching**: Caches schema information for 30 minutes
- **Type Safety**: Provides typed interfaces for schema elements
- **Field Optimization**: Generates optimal field selections

### 3. AI GraphQL API Route (`app/routes/api.ai-graphql.tsx`)
- **AI-Powered Generation**: Integrates OpenAI with Shopify GraphQL
- **Error Handling**: Comprehensive error handling with fallbacks
- **Conversation Management**: Saves AI analysis and query metadata
- **Response Formatting**: AI-generated explanations and insights

### 4. Enhanced Chat Interface (`app/routes/app._index.tsx`)
- **Interactive UI**: Shows generated queries with expand/collapse
- **AI Indicators**: Clear visual indicators for AI-generated content
- **Rich Results**: Contextual display of query results
- **Real-time Feedback**: Loading states and error messaging

## Usage Examples

The AI system can understand complex natural language queries:

### 🛍️ Product Queries
- **"Show me products with low inventory"** → AI generates filters for `totalInventory:<10`
- **"Find Nike products that are on sale"** → AI searches for vendor + sale status
- **"List products created this week with variants"** → AI adds date filters + variant fields
- **"Get expensive products over $100"** → AI adds price range filters

### 📦 Order Queries
- **"Show recent orders over $500"** → AI filters by date + total price
- **"Find orders with pending payments"** → AI filters by financial status
- **"Get orders from customer john@example.com"** → AI searches by customer email
- **"List orders with more than 3 items"** → AI adds line item count filters

### 👥 Customer Queries
- **"Show customers who haven't ordered in 30 days"** → AI generates date-based filters
- **"Find customers from California"** → AI searches by address/location
- **"List top customers by order value"** → AI adds sorting by total spent
- **"Get customers with abandoned carts"** → AI generates checkout-specific queries

### 🏷️ Advanced Queries
- **"Show me all collections with more than 10 products"** → AI adds product count filters
- **"Find draft products by specific vendor updated last month"** → Complex multi-filter query
- **"Get orders shipped to New York with tracking numbers"** → Location + fulfillment filters

## Setup & Configuration

### 1. Environment Variables

Add to your `.env` file:

```bash
# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Shopify Configuration (Already configured)
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=read_products,write_products,read_orders,write_orders,read_customers,write_customers
```

### 2. Install Dependencies

```bash
npm install ai openai zod
```

### 3. OpenAI API Key Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### 4. Test the Integration

Start your dev server and try queries like:
- "Show me all products"
- "Find orders from last week"
- "Get customers with no recent orders"

## How It Works

### 1. **AI Analysis Phase**
```typescript
// User query: "Show me products with low inventory"
const analysis = await aiQueryGenerator.analyzeQuery(userQuery);
// Result: { operation: "products", filters: [{ field: "totalInventory", operator: "less_than", value: "10" }] }
```

### 2. **Schema Introspection**
```typescript
// Get available fields for the Product type
const availableFields = await graphqlIntrospectionService.getTypeFields(admin, "Product");
// AI selects optimal fields based on query context
```

### 3. **Smart Query Generation**
```typescript
// AI generates optimized GraphQL with proper syntax and fields
const query = `#graphql
query getProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    edges {
      node {
        id
        title
        totalInventory
        status
        createdAt
      }
    }
  }
}`;
```

### 4. **Execution & Results**
```typescript
// Execute and format results with AI-generated explanations
const result = await admin.graphql(query, { variables: { first: 10, query: "inventory_total:<10" } });
```

## Advanced Query Generation

The system can generate sophisticated queries based on user intent:

### Product Search with Variants
```graphql
query getProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    edges {
      node {
        id
        title
        handle
        status
        variants(first: 5) {
          edges {
            node {
              id
              title
              price
              availableForSale
            }
          }
        }
      }
    }
  }
}
```

### Order Details with Customer Info
```graphql
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
        customer {
          id
          displayName
          email
        }
        lineItems(first: 5) {
          edges {
            node {
              id
              title
              quantity
            }
          }
        }
      }
    }
  }
}
```

## Error Handling

The system includes comprehensive error handling:

- **Query Generation Errors**: Fallback to basic hardcoded queries
- **Validation Errors**: Display validation messages to users
- **Execution Errors**: Show GraphQL execution errors with helpful messages
- **MCP Connection Issues**: Graceful degradation to basic functionality

## Future Enhancements

### 1. Query Caching
Implement caching for frequently used queries to improve performance.

### 2. Query History
Add ability to save and reuse previous queries.

### 3. Advanced Filtering
Support for complex date ranges, numerical comparisons, and boolean logic.

### 4. Export Functionality
Allow users to export query results in various formats (CSV, JSON).

### 5. Query Templates
Pre-built query templates for common business operations.

## Testing

To test the AI GraphQL functionality:

1. Start your Shopify app development server
2. Navigate to the chat interface
3. Try natural language queries like:
   - "show me all products"
   - "find orders from last week"
   - "get customers with no orders"

The system will generate appropriate GraphQL queries, validate them, execute them, and display both the query and results in the chat interface.

## Security Considerations

- All queries are validated against the Shopify schema before execution
- Rate limiting should be implemented for AI query generation
- User permissions are enforced through Shopify's authentication system
- Query complexity analysis can be added to prevent expensive operations

## Performance Optimization

- Implement query result caching for frequently accessed data
- Use pagination efficiently to limit result set sizes
- Consider implementing query batching for multiple operations
- Monitor and log query performance for optimization opportunities