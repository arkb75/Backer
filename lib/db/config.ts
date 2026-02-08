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
} as const

export const DYNAMO_INDEXES = {
    usersByEmail: "email-index",
    foundersByUserId: "userId-index",
    founderProductsByFounderId: "founderId-index",
    founderProductsByProductId: "productId-index",
    founderInvitesByInviteeEmail: "inviteeEmail-index",
    founderInvitesByInviterFounderId: "inviterFounderId-index",
    founderInvitesByProductId: "productId-index",
    investorsByUserId: "userId-index",
    investorInterestsByFounderId: "founderId-index",
    investorInterestsByProductId: "productId-index",
} as const
