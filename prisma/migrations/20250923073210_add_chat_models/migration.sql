-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT
);

-- CreateIndex
CREATE INDEX "ChatMessage_shop_timestamp_idx" ON "ChatMessage"("shop", "timestamp");

-- CreateIndex
CREATE INDEX "ChatConversation_shop_updatedAt_idx" ON "ChatConversation"("shop", "updatedAt");
