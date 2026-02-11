const readEnv = (name: string, fallback: string): string => {
    const value = process.env[name]
    if (!value) return fallback
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : fallback
}

export const DYNAMO_TABLES = {
    users: readEnv("DYNAMODB_TABLE_USERS", "backer-dev-users"),
    founders: readEnv("DYNAMODB_TABLE_FOUNDERS", "backer-dev-founders"),
    products: readEnv("DYNAMODB_TABLE_PRODUCTS", "backer-dev-products"),
    founderProducts: readEnv("DYNAMODB_TABLE_FOUNDER_PRODUCTS", "backer-dev-founder-products"),
    founderInvites: readEnv("DYNAMODB_TABLE_FOUNDER_INVITES", "backer-dev-founder-invites"),
    investors: readEnv("DYNAMODB_TABLE_INVESTORS", "backer-dev-investors"),
    investorInterests: readEnv("DYNAMODB_TABLE_INVESTOR_INTERESTS", "backer-dev-investor-interests"),
    feedEvents: readEnv("DYNAMODB_TABLE_FEED_EVENTS", "backer-dev-feed-events"),
    conversations: readEnv("DYNAMODB_TABLE_CONVERSATIONS", "backer-dev-conversations"),
    messages: process.env.DYNAMODB_TABLE_MESSAGES || "backer-dev-messages",
    investments: process.env.DYNAMODB_TABLE_INVESTMENTS || "backer-dev-investments",
} as const

export const DYNAMO_INDEXES = {
    users: {
        byEmail: "email-index",
    },
    founders: {
        byUserId: "userId-index",
    },
    founderProducts: {
        byFounderId: "founderId-index",
        byProductId: "productId-index",
    },
    investors: {
        byUserId: "userId-index",
    },
    investorInterests: {
        byFounderId: "founderId-index",
        byProductId: "productId-index",
        byInvestorId: "investorId-index",
    },
    feedEvents: {
        byInvestorId: "investorId-index",
        byProductId: "productId-index",
        byEventType: "eventType-index",
    },
    conversations: {
        byInvestorId: "investorId-index",
        byFounderId: "founderId-index",
    },
    messages: {
        byConversationId: "conversationId-index",
    },
    investments: {
        byInvestorId: "investorId-index",
        byProductId: "productId-index",
        byFounderId: "founderId-index",
    },
    founderInvites: {
        byInviteeEmail: "inviteeEmail-index",
        byInviterFounderId: "inviterFounderId-index",
        byProductId: "productId-index",
    },
} as const
