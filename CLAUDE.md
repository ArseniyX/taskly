# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Shopify CLI
- `npm run build` - Build the Remix application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest

### Shopify CLI
- `npm run config:link` - Link to Shopify app configuration
- `npm run generate` - Generate Shopify app resources
- `npm run deploy` - Deploy the app
- `npm run config:use` - Use specific app configuration
- `npm run env` - Manage environment variables

### Database
- `npm run setup` - Generate Prisma client and deploy migrations
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate deploy` - Deploy database migrations
- `npx prisma studio` - Open Prisma Studio for database management

### Testing
- `npx vitest run` - Run all tests
- `npx vitest watch` - Run tests in watch mode
- `npx vitest run --reporter=verbose` - Run tests with detailed output

## Architecture

### Core Application Structure

This is a **Shopify app** built with **Remix** and **React** that provides AI-powered chat functionality for store operations. The app uses **Prisma** with SQLite for data persistence and integrates with the Shopify Admin API.

### Key Components

**Chat System Architecture:**
- `app/routes/app._index.tsx` - Main chat interface with real-time messaging
- `app/services/chat.server.ts` - Chat service for message/conversation management
- `app/services/ai-query-generator.server.ts` - AI service that analyzes user messages and generates GraphQL queries
- `app/routes/api.chat.tsx` - API endpoint for chat operations

**AI Query Flow:**
1. User sends natural language message
2. `aiQueryGenerator.identifyIntent()` categorizes as query/mutation/message
3. For queries: generates GraphQL, executes against Shopify API, returns formatted response
4. Results stored in chat history with generated query metadata

**Subscription & Usage Tracking:**
- `app/services/usage.server.ts` - Tracks API usage per shop with plan limits
- `app/routes/app.subscription.tsx` - Subscription management UI
- Plans: Free (20 queries/month), Pro (10k queries/month), Enterprise (unlimited)

### Database Schema (Prisma)

**Key Models:**
- `Session` - Shopify app session storage
- `ChatMessage` - Individual chat messages with role (user/assistant) and metadata
- `ChatConversation` - Chat conversation groupings
- `Subscription` - Shop subscription plans and billing status
- `UsageRecord` - Usage tracking per shop/subscription

### Authentication & Shopify Integration

- Uses `@shopify/shopify-app-remix` for authentication
- `app/shopify.server.ts` - Shopify app configuration and admin API client
- Session storage via Prisma adapter
- GraphQL Admin API integration for store data access

### Development Patterns

**Service Layer Pattern:**
- Services in `app/services/` handle business logic
- Each service exports singleton instance (e.g., `export const chatService = new ChatService()`)
- Services use Prisma for data access and Shopify Admin API for store operations

**Route Organization:**
- `app/routes/app.*` - Protected app routes requiring Shopify authentication
- `app/routes/api.*` - API endpoints
- `app/routes/auth.*` - Authentication flows
- `app/routes/webhooks.*` - Shopify webhook handlers

### Testing

- **Vitest** for unit testing
- Test files in `app/services/__tests__/`
- Mocked services for AI and external API calls
- Test environment configured in `vitest.config.ts`

### Key Dependencies

- **Remix** - Full-stack web framework
- **@shopify/polaris** - Shopify's design system
- **@shopify/shopify-app-remix** - Shopify app development tools
- **Prisma** - Database ORM with SQLite
- **ai** + **@ai-sdk/openai** - AI SDK for natural language processing (currently mocked)
- **zod** - Runtime type validation

### Environment Setup

Requires Shopify partner account and app configuration. Database migrations auto-run on setup. The app uses file-based SQLite for development simplicity.