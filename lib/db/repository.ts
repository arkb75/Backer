import { randomUUID } from "crypto"
import {
    BatchGetCommand,
    DeleteCommand,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    TransactWriteCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb"
import { dynamo } from "@/lib/db/client"
import { DYNAMO_INDEXES, DYNAMO_TABLES } from "@/lib/db/config"
import type {
    ConversationRecord,
    FounderPhotoRecord,
    FounderInviteRecord,
    FounderInviteStatus,
    FounderProductRecord,
    FounderPromptRecord,
    FounderRecord,
    FounderType,
    InterestType,
    InvestmentStage,
    InvestorInterestRecord,
    InvestorInterestTagRecord,
    InvestorRecord,
    MessageRecord,
    PortfolioCompanyRecord,
    ProductRecord,
    ProductStatus,
    SenderType,
    UserRecord,
    UserType,
    WorkExperienceRecord,
    SkillRecord,
} from "@/lib/db/types"

const nowIso = (): string => new Date().toISOString()

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const sortByOrder = <T extends { order: number }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.order - b.order)

const sortByCreatedAtDesc = <T extends { createdAt?: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => {
        const left = a.createdAt ? Date.parse(a.createdAt) : 0
        const right = b.createdAt ? Date.parse(b.createdAt) : 0
        return right - left
    })

const sortConversationsByLastMessageAtDesc = (items: ConversationRecord[]): ConversationRecord[] =>
    [...items].sort((a, b) => {
        const left = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0
        const right = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0
        return right - left
    })

const chunk = <T>(items: T[], size: number): T[][] => {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += size) {
        batches.push(items.slice(i, i + size))
    }
    return batches
}

const dedupeIds = (ids: string[]): string[] => Array.from(new Set(ids.filter(Boolean)))

const normalizeFounder = (record: FounderRecord): FounderRecord => ({
    ...record,
    workExperience: sortByOrder(record.workExperience || []),
    skills: record.skills || [],
    photos: sortByOrder(record.photos || []),
    prompts: sortByOrder(record.prompts || []),
})

const normalizeInvestor = (record: InvestorRecord): InvestorRecord => ({
    ...record,
    portfolio: sortByOrder(record.portfolio || []),
    interestTags: record.interestTags || [],
})

const normalizeProduct = (record: ProductRecord): ProductRecord => ({
    ...record,
    status: record.status || "IDEA",
    amountRaised: record.amountRaised ?? 0,
})

const normalizeFounderInvite = (record: FounderInviteRecord): FounderInviteRecord => ({
    ...record,
    role: record.role || "Co-Founder",
    message: record.message || null,
    status: (record.status || "PENDING") as FounderInviteStatus,
    inviteeUserId: record.inviteeUserId || null,
    inviteeFounderId: record.inviteeFounderId || null,
    respondedAt: record.respondedAt || null,
})

const normalizeConversation = (record: ConversationRecord): ConversationRecord => ({
    ...record,
    lastMessageSenderType: record.lastMessageSenderType || null,
    // Older conversations won't have read-tracking fields; default them to "already read"
    // so historical threads do not show phantom unread badges.
    founderLastReadAt: record.founderLastReadAt || record.lastMessageAt || record.createdAt || null,
    investorLastReadAt: record.investorLastReadAt || record.lastMessageAt || record.createdAt || null,
})

const getSingleById = async <T>(tableName: string, id: string): Promise<T | null> => {
    const response = await dynamo.send(new GetCommand({
        TableName: tableName,
        Key: { id },
    }))
    return (response.Item as T | undefined) || null
}

const batchGetByIds = async <T>(tableName: string, ids: string[]): Promise<T[]> => {
    const uniqueIds = dedupeIds(ids)
    if (uniqueIds.length === 0) return []

    const allItems: T[] = []

    for (const idBatch of chunk(uniqueIds, 100)) {
        let pendingKeys = idBatch.map((id) => ({ id }))

        while (pendingKeys.length > 0) {
            const result = await dynamo.send(new BatchGetCommand({
                RequestItems: {
                    [tableName]: {
                        Keys: pendingKeys,
                    },
                },
            }))

            const items = (result.Responses?.[tableName] || []) as T[]
            allItems.push(...items)

            pendingKeys = (result.UnprocessedKeys?.[tableName]?.Keys || []) as Array<{ id: string }>
        }
    }

    return allItems
}

export async function getUserById(id: string): Promise<UserRecord | null> {
    return getSingleById<UserRecord>(DYNAMO_TABLES.users, id)
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = normalizeEmail(email)
    try {
        const response = await dynamo.send(new QueryCommand({
            TableName: DYNAMO_TABLES.users,
            IndexName: DYNAMO_INDEXES.usersByEmail,
            KeyConditionExpression: "#email = :email",
            ExpressionAttributeNames: {
                "#email": "email",
            },
            ExpressionAttributeValues: {
                ":email": normalizedEmail,
            },
            Limit: 1,
        }))

        if (response.Items?.[0]) {
            return response.Items[0] as UserRecord
        }
    } catch (error) {
        console.warn("[DYNAMO_USERS_BY_EMAIL_INDEX_FALLBACK]", error)
    }

    const fallback = await dynamo.send(new ScanCommand({
        TableName: DYNAMO_TABLES.users,
        FilterExpression: "#email = :email",
        ExpressionAttributeNames: {
            "#email": "email",
        },
        ExpressionAttributeValues: {
            ":email": normalizedEmail,
        },
        ConsistentRead: true,
        Limit: 1,
    }))

    return (fallback.Items?.[0] as UserRecord | undefined) || null
}

export async function createUser(input: {
    email: string
    passwordHash: string
    userType: UserType
}): Promise<UserRecord> {
    const normalizedEmail = normalizeEmail(input.email)
    const existing = await getUserByEmail(normalizedEmail)
    if (existing) {
        throw new Error("User already exists")
    }

    const timestamp = nowIso()
    const user: UserRecord = {
        id: randomUUID(),
        email: normalizedEmail,
        passwordHash: input.passwordHash,
        userType: input.userType,
        createdAt: timestamp,
        updatedAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.users,
        Item: user,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return user
}

export async function getFounderById(id: string): Promise<FounderRecord | null> {
    const founder = await getSingleById<FounderRecord>(DYNAMO_TABLES.founders, id)
    return founder ? normalizeFounder(founder) : null
}

export async function getFoundersByIds(ids: string[]): Promise<FounderRecord[]> {
    const founders = await batchGetByIds<FounderRecord>(DYNAMO_TABLES.founders, ids)
    return founders.map(normalizeFounder)
}

export async function listFounders(): Promise<FounderRecord[]> {
    const response = await dynamo.send(new ScanCommand({
        TableName: DYNAMO_TABLES.founders,
    }))

    const items = (response.Items || []) as FounderRecord[]
    return sortByCreatedAtDesc(items.map(normalizeFounder))
}

export async function getFounderByUserId(userId: string): Promise<FounderRecord | null> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.founders,
        IndexName: DYNAMO_INDEXES.foundersByUserId,
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: {
            "#userId": "userId",
        },
        ExpressionAttributeValues: {
            ":userId": userId,
        },
        Limit: 1,
    }))

    const founder = (response.Items?.[0] as FounderRecord | undefined) || null
    return founder ? normalizeFounder(founder) : null
}

export async function createFounderOnboarding(input: {
    userId: string
    name: string
    headline: string
    location: string
    bio: string
    founderType: FounderType
    videoUrl?: string | null
    photos: string[]
    prompts: Array<{ prompt: string; answer: string }>
}): Promise<FounderRecord> {
    const existing = await getFounderByUserId(input.userId)
    if (existing) {
        return existing
    }

    const timestamp = nowIso()

    const photos: FounderPhotoRecord[] = input.photos.map((url, index) => ({
        id: randomUUID(),
        url,
        order: index,
        caption: null,
        createdAt: timestamp,
    }))

    const prompts: FounderPromptRecord[] = input.prompts
        .filter((prompt) => prompt.prompt && prompt.answer)
        .map((prompt, index) => ({
            id: randomUUID(),
            prompt: prompt.prompt,
            answer: prompt.answer,
            order: index,
            createdAt: timestamp,
        }))

    const founder: FounderRecord = {
        id: randomUUID(),
        userId: input.userId,
        name: input.name,
        headline: input.headline,
        location: input.location,
        bio: input.bio,
        founderType: input.founderType,
        videoUrl: input.videoUrl || null,
        yearsExperience: null,
        linkedinUrl: null,
        twitterUrl: null,
        websiteUrl: null,
        workExperience: [] as WorkExperienceRecord[],
        skills: [] as SkillRecord[],
        photos,
        prompts,
        createdAt: timestamp,
        updatedAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.founders,
        Item: founder,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return founder
}

export async function updateFounderProfile(input: {
    founderId: string
    name: string
    headline: string
    location: string
    bio: string
    founderType: FounderType
    videoUrl?: string | null
    yearsExperience?: number | null
    linkedinUrl?: string | null
    twitterUrl?: string | null
    websiteUrl?: string | null
    photos: string[]
    prompts: Array<{ prompt: string; answer: string }>
}): Promise<FounderRecord> {
    const founder = await getFounderById(input.founderId)
    if (!founder) {
        throw new Error("Founder not found")
    }

    const timestamp = nowIso()

    const photos: FounderPhotoRecord[] = input.photos
        .filter((url) => typeof url === "string" && url.trim().length > 0)
        .map((url, index) => ({
            id: randomUUID(),
            url: url.trim(),
            order: index,
            caption: null,
            createdAt: timestamp,
        }))

    const prompts: FounderPromptRecord[] = input.prompts
        .filter((item) => item.prompt?.trim() && item.answer?.trim())
        .map((item, index) => ({
            id: randomUUID(),
            prompt: item.prompt.trim(),
            answer: item.answer.trim(),
            order: index,
            createdAt: timestamp,
        }))

    const updatedFounder: FounderRecord = {
        ...founder,
        name: input.name.trim(),
        headline: input.headline.trim(),
        location: input.location.trim(),
        bio: input.bio.trim(),
        founderType: input.founderType,
        videoUrl: input.videoUrl?.trim() || null,
        yearsExperience: input.yearsExperience ?? null,
        linkedinUrl: input.linkedinUrl?.trim() || null,
        twitterUrl: input.twitterUrl?.trim() || null,
        websiteUrl: input.websiteUrl?.trim() || null,
        photos,
        prompts,
        updatedAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.founders,
        Item: updatedFounder,
        ConditionExpression: "attribute_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return normalizeFounder(updatedFounder)
}

export async function getInvestorById(id: string): Promise<InvestorRecord | null> {
    const investor = await getSingleById<InvestorRecord>(DYNAMO_TABLES.investors, id)
    return investor ? normalizeInvestor(investor) : null
}

export async function getInvestorByUserId(userId: string): Promise<InvestorRecord | null> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.investors,
        IndexName: DYNAMO_INDEXES.investorsByUserId,
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: {
            "#userId": "userId",
        },
        ExpressionAttributeValues: {
            ":userId": userId,
        },
        Limit: 1,
    }))

    const investor = (response.Items?.[0] as InvestorRecord | undefined) || null
    return investor ? normalizeInvestor(investor) : null
}

export async function createInvestorOnboarding(input: {
    userId: string
    name: string
    firmName?: string | null
    title?: string | null
    location?: string | null
    bio?: string | null
    profileImage?: string | null
    investmentStagePreference?: InvestmentStage | null
    interestTags: string[]
    portfolio: Array<{
        name: string
        logoUrl?: string | null
        stage: InvestmentStage
        isExited?: boolean
        exitYear?: number | null
    }>
    linkedinUrl?: string | null
    twitterUrl?: string | null
    websiteUrl?: string | null
}): Promise<InvestorRecord> {
    const existing = await getInvestorByUserId(input.userId)
    if (existing) {
        return existing
    }

    const timestamp = nowIso()

    const portfolio: PortfolioCompanyRecord[] = input.portfolio
        .filter((company) => company.name?.trim())
        .map((company, index) => ({
            id: randomUUID(),
            name: company.name.trim(),
            logoUrl: company.logoUrl || null,
            stage: company.stage,
            isExited: Boolean(company.isExited),
            exitYear: company.exitYear || null,
            order: index,
            createdAt: timestamp,
        }))

    const interestTags: InvestorInterestTagRecord[] = input.interestTags
        .filter((tag) => tag?.trim())
        .map((tag) => ({
            id: randomUUID(),
            name: tag.trim(),
            createdAt: timestamp,
        }))

    const investor: InvestorRecord = {
        id: randomUUID(),
        userId: input.userId,
        name: input.name.trim(),
        firmName: input.firmName?.trim() || null,
        title: input.title?.trim() || null,
        location: input.location?.trim() || null,
        bio: input.bio?.trim() || null,
        profileImage: input.profileImage?.trim() || null,
        investmentStagePreference: input.investmentStagePreference || "SEED",
        linkedinUrl: input.linkedinUrl?.trim() || null,
        twitterUrl: input.twitterUrl?.trim() || null,
        websiteUrl: input.websiteUrl?.trim() || null,
        portfolio,
        interestTags,
        createdAt: timestamp,
        updatedAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.investors,
        Item: investor,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return investor
}

export async function updateInvestorProfile(input: {
    investorId: string
    name: string
    firmName?: string | null
    title?: string | null
    location?: string | null
    bio?: string | null
    profileImage?: string | null
    investmentStagePreference?: InvestmentStage | null
    linkedinUrl?: string | null
    twitterUrl?: string | null
    websiteUrl?: string | null
    interestTags: string[]
    portfolio: Array<{
        name: string
        logoUrl?: string | null
        stage: InvestmentStage
        isExited?: boolean
        exitYear?: number | null
    }>
}): Promise<InvestorRecord> {
    const investor = await getInvestorById(input.investorId)
    if (!investor) {
        throw new Error("Investor not found")
    }

    const timestamp = nowIso()

    const portfolio: PortfolioCompanyRecord[] = input.portfolio
        .filter((company) => company.name?.trim())
        .map((company, index) => ({
            id: randomUUID(),
            name: company.name.trim(),
            logoUrl: company.logoUrl?.trim() || null,
            stage: company.stage,
            isExited: Boolean(company.isExited),
            exitYear: company.exitYear || null,
            order: index,
            createdAt: timestamp,
        }))

    const interestTags: InvestorInterestTagRecord[] = input.interestTags
        .filter((tag) => tag?.trim())
        .map((tag) => ({
            id: randomUUID(),
            name: tag.trim(),
            createdAt: timestamp,
        }))

    const updatedInvestor: InvestorRecord = {
        ...investor,
        name: input.name.trim(),
        firmName: input.firmName?.trim() || null,
        title: input.title?.trim() || null,
        location: input.location?.trim() || null,
        bio: input.bio?.trim() || null,
        profileImage: input.profileImage?.trim() || null,
        investmentStagePreference: input.investmentStagePreference || investor.investmentStagePreference || "SEED",
        linkedinUrl: input.linkedinUrl?.trim() || null,
        twitterUrl: input.twitterUrl?.trim() || null,
        websiteUrl: input.websiteUrl?.trim() || null,
        portfolio,
        interestTags,
        updatedAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.investors,
        Item: updatedInvestor,
        ConditionExpression: "attribute_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return normalizeInvestor(updatedInvestor)
}

export async function getProductById(id: string): Promise<ProductRecord | null> {
    const product = await getSingleById<ProductRecord>(DYNAMO_TABLES.products, id)
    return product ? normalizeProduct(product) : null
}

export async function getProductsByIds(ids: string[]): Promise<ProductRecord[]> {
    const products = await batchGetByIds<ProductRecord>(DYNAMO_TABLES.products, ids)
    return products.map(normalizeProduct)
}

export async function listProducts(): Promise<ProductRecord[]> {
    const response = await dynamo.send(new ScanCommand({
        TableName: DYNAMO_TABLES.products,
    }))

    const items = (response.Items || []) as ProductRecord[]
    return sortByCreatedAtDesc(items.map(normalizeProduct))
}

export async function createCompanyForFounder(input: {
    founderId: string
    name: string
    tagline: string
    description?: string | null
    problem?: string | null
    solution?: string | null
    websiteUrl?: string | null
    stage?: string | null
    askAmount?: number | null
    videoUrl?: string | null
    logoUrl?: string | null
    customSections?: ProductRecord["customSections"]
    status?: ProductStatus
}): Promise<{ product: ProductRecord; founderProduct: FounderProductRecord }> {
    const timestamp = nowIso()

    const countResponse = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.founderProducts,
        IndexName: DYNAMO_INDEXES.founderProductsByFounderId,
        KeyConditionExpression: "#founderId = :founderId",
        ExpressionAttributeNames: {
            "#founderId": "founderId",
        },
        ExpressionAttributeValues: {
            ":founderId": input.founderId,
        },
        Select: "COUNT",
    }))

    const product: ProductRecord = {
        id: randomUUID(),
        name: input.name,
        tagline: input.tagline,
        description: input.description || null,
        problem: input.problem || null,
        solution: input.solution || null,
        websiteUrl: input.websiteUrl || null,
        stage: input.stage || null,
        askAmount: input.askAmount ?? null,
        videoUrl: input.videoUrl || null,
        logoUrl: input.logoUrl || null,
        status: input.status || "BUILDING",
        amountRaised: 0,
        customSections: input.customSections || [],
        createdAt: timestamp,
        updatedAt: timestamp,
    }

    const founderProduct: FounderProductRecord = {
        id: randomUUID(),
        founderId: input.founderId,
        productId: product.id,
        role: "Founder",
        isPrimary: (countResponse.Count || 0) === 0,
        createdAt: timestamp,
    }

    await dynamo.send(new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: DYNAMO_TABLES.products,
                    Item: product,
                    ConditionExpression: "attribute_not_exists(#id)",
                    ExpressionAttributeNames: {
                        "#id": "id",
                    },
                },
            },
            {
                Put: {
                    TableName: DYNAMO_TABLES.founderProducts,
                    Item: founderProduct,
                    ConditionExpression: "attribute_not_exists(#id)",
                    ExpressionAttributeNames: {
                        "#id": "id",
                    },
                },
            },
        ],
    }))

    return { product, founderProduct }
}

export async function updateProductById(input: {
    productId: string
    name: string
    tagline: string
    description?: string | null
    problem?: string | null
    solution?: string | null
    websiteUrl?: string | null
    stage?: string | null
    askAmount?: number | null
    videoUrl?: string | null
    logoUrl?: string | null
    status?: ProductStatus
    customSections?: ProductRecord["customSections"]
}): Promise<ProductRecord> {
    const product = await getProductById(input.productId)
    if (!product) {
        throw new Error("Product not found")
    }

    const updatedProduct: ProductRecord = {
        ...product,
        name: input.name.trim(),
        tagline: input.tagline.trim(),
        description: input.description || null,
        problem: input.problem || null,
        solution: input.solution || null,
        websiteUrl: input.websiteUrl || null,
        stage: input.stage || null,
        askAmount: input.askAmount ?? null,
        videoUrl: input.videoUrl || null,
        logoUrl: input.logoUrl || null,
        status: input.status || product.status,
        customSections: input.customSections || [],
        updatedAt: nowIso(),
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.products,
        Item: updatedProduct,
        ConditionExpression: "attribute_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return normalizeProduct(updatedProduct)
}

export async function listFounderProductsByFounderId(founderId: string): Promise<FounderProductRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.founderProducts,
        IndexName: DYNAMO_INDEXES.founderProductsByFounderId,
        KeyConditionExpression: "#founderId = :founderId",
        ExpressionAttributeNames: {
            "#founderId": "founderId",
        },
        ExpressionAttributeValues: {
            ":founderId": founderId,
        },
    }))

    const items = (response.Items || []) as FounderProductRecord[]
    return sortByCreatedAtDesc(items)
}

export async function listFounderProductsByProductId(productId: string): Promise<FounderProductRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.founderProducts,
        IndexName: DYNAMO_INDEXES.founderProductsByProductId,
        KeyConditionExpression: "#productId = :productId",
        ExpressionAttributeNames: {
            "#productId": "productId",
        },
        ExpressionAttributeValues: {
            ":productId": productId,
        },
    }))

    const items = (response.Items || []) as FounderProductRecord[]
    return sortByCreatedAtDesc(items)
}

export async function listInvestorInterestsByFounderId(founderId: string): Promise<InvestorInterestRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        IndexName: DYNAMO_INDEXES.investorInterestsByFounderId,
        KeyConditionExpression: "#founderId = :founderId",
        ExpressionAttributeNames: {
            "#founderId": "founderId",
        },
        ExpressionAttributeValues: {
            ":founderId": founderId,
        },
    }))

    return (response.Items || []) as InvestorInterestRecord[]
}

export async function listInvestorInterestsByProductId(productId: string): Promise<InvestorInterestRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        IndexName: DYNAMO_INDEXES.investorInterestsByProductId,
        KeyConditionExpression: "#productId = :productId",
        ExpressionAttributeNames: {
            "#productId": "productId",
        },
        ExpressionAttributeValues: {
            ":productId": productId,
        },
    }))

    return (response.Items || []) as InvestorInterestRecord[]
}

export async function getFounderInviteById(id: string): Promise<FounderInviteRecord | null> {
    const invite = await getSingleById<FounderInviteRecord>(DYNAMO_TABLES.founderInvites, id)
    return invite ? normalizeFounderInvite(invite) : null
}

export async function listFounderInvitesByInviteeEmail(email: string): Promise<FounderInviteRecord[]> {
    const normalizedEmail = normalizeEmail(email)

    try {
        const response = await dynamo.send(new QueryCommand({
            TableName: DYNAMO_TABLES.founderInvites,
            IndexName: DYNAMO_INDEXES.founderInvitesByInviteeEmail,
            KeyConditionExpression: "#inviteeEmail = :inviteeEmail",
            ExpressionAttributeNames: {
                "#inviteeEmail": "inviteeEmail",
            },
            ExpressionAttributeValues: {
                ":inviteeEmail": normalizedEmail,
            },
        }))

        const items = (response.Items || []) as FounderInviteRecord[]
        return sortByCreatedAtDesc(items.map(normalizeFounderInvite))
    } catch (error) {
        console.warn("[DYNAMO_FOUNDER_INVITES_BY_EMAIL_FALLBACK]", error)
    }

    const fallback = await dynamo.send(new ScanCommand({
        TableName: DYNAMO_TABLES.founderInvites,
        FilterExpression: "#inviteeEmail = :inviteeEmail",
        ExpressionAttributeNames: {
            "#inviteeEmail": "inviteeEmail",
        },
        ExpressionAttributeValues: {
            ":inviteeEmail": normalizedEmail,
        },
    }))

    const fallbackItems = (fallback.Items || []) as FounderInviteRecord[]
    return sortByCreatedAtDesc(fallbackItems.map(normalizeFounderInvite))
}

export async function listPendingFounderInvitesByInviteeEmail(email: string): Promise<FounderInviteRecord[]> {
    const invites = await listFounderInvitesByInviteeEmail(email)
    return invites.filter((invite) => invite.status === "PENDING")
}

export async function listFounderInvitesByInviterFounderId(inviterFounderId: string): Promise<FounderInviteRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.founderInvites,
        IndexName: DYNAMO_INDEXES.founderInvitesByInviterFounderId,
        KeyConditionExpression: "#inviterFounderId = :inviterFounderId",
        ExpressionAttributeNames: {
            "#inviterFounderId": "inviterFounderId",
        },
        ExpressionAttributeValues: {
            ":inviterFounderId": inviterFounderId,
        },
    }))

    const items = (response.Items || []) as FounderInviteRecord[]
    return sortByCreatedAtDesc(items.map(normalizeFounderInvite))
}

export async function listFounderInvitesByProductId(productId: string): Promise<FounderInviteRecord[]> {
    try {
        const response = await dynamo.send(new QueryCommand({
            TableName: DYNAMO_TABLES.founderInvites,
            IndexName: DYNAMO_INDEXES.founderInvitesByProductId,
            KeyConditionExpression: "#productId = :productId",
            ExpressionAttributeNames: {
                "#productId": "productId",
            },
            ExpressionAttributeValues: {
                ":productId": productId,
            },
        }))

        const items = (response.Items || []) as FounderInviteRecord[]
        return sortByCreatedAtDesc(items.map(normalizeFounderInvite))
    } catch (error) {
        console.warn("[DYNAMO_FOUNDER_INVITES_BY_PRODUCT_ID_FALLBACK]", error)
    }

    const fallback = await dynamo.send(new ScanCommand({
        TableName: DYNAMO_TABLES.founderInvites,
        FilterExpression: "#productId = :productId",
        ExpressionAttributeNames: {
            "#productId": "productId",
        },
        ExpressionAttributeValues: {
            ":productId": productId,
        },
    }))

    const fallbackItems = (fallback.Items || []) as FounderInviteRecord[]
    return sortByCreatedAtDesc(fallbackItems.map(normalizeFounderInvite))
}

export async function createFounderInvite(input: {
    productId: string
    productName: string
    inviterFounderId: string
    inviterFounderName: string
    inviteeEmail: string
    role?: string | null
    message?: string | null
}): Promise<FounderInviteRecord> {
    const inviteeEmail = normalizeEmail(input.inviteeEmail)
    const existing = await listPendingFounderInvitesByInviteeEmail(inviteeEmail)
    if (existing.some((invite) => invite.productId === input.productId)) {
        throw new Error("An active invite already exists for this email and company")
    }

    const invite: FounderInviteRecord = {
        id: randomUUID(),
        productId: input.productId,
        productName: input.productName,
        inviterFounderId: input.inviterFounderId,
        inviterFounderName: input.inviterFounderName,
        inviteeEmail,
        inviteeUserId: null,
        inviteeFounderId: null,
        role: input.role?.trim() || "Co-Founder",
        message: input.message?.trim() || null,
        status: "PENDING",
        createdAt: nowIso(),
        respondedAt: null,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.founderInvites,
        Item: invite,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return invite
}

const updateFounderInviteStatus = async (input: {
    inviteId: string
    status: FounderInviteStatus
    inviteeUserId?: string | null
    inviteeFounderId?: string | null
}): Promise<FounderInviteRecord> => {
    const result = await dynamo.send(new UpdateCommand({
        TableName: DYNAMO_TABLES.founderInvites,
        Key: { id: input.inviteId },
        UpdateExpression: "SET #status = :status, #respondedAt = :respondedAt, #inviteeUserId = :inviteeUserId, #inviteeFounderId = :inviteeFounderId",
        ExpressionAttributeNames: {
            "#status": "status",
            "#respondedAt": "respondedAt",
            "#inviteeUserId": "inviteeUserId",
            "#inviteeFounderId": "inviteeFounderId",
        },
        ExpressionAttributeValues: {
            ":status": input.status,
            ":respondedAt": nowIso(),
            ":inviteeUserId": input.inviteeUserId || null,
            ":inviteeFounderId": input.inviteeFounderId || null,
        },
        ReturnValues: "ALL_NEW",
    }))

    const updated = result.Attributes as FounderInviteRecord | undefined
    if (!updated) {
        throw new Error("Failed to update invite")
    }
    return normalizeFounderInvite(updated)
}

export async function acceptFounderInvite(input: {
    inviteId: string
    inviteeUserId: string
    inviteeFounderId: string
    inviteeEmail: string
}): Promise<FounderInviteRecord> {
    const invite = await getFounderInviteById(input.inviteId)
    if (!invite) {
        throw new Error("Invite not found")
    }
    if (normalizeEmail(invite.inviteeEmail) !== normalizeEmail(input.inviteeEmail)) {
        throw new Error("Invite email mismatch")
    }
    if (invite.status === "ACCEPTED") {
        return invite
    }
    if (invite.status !== "PENDING") {
        throw new Error("Invite is no longer pending")
    }

    const memberships = await listFounderProductsByFounderId(input.inviteeFounderId)
    const alreadyJoined = memberships.some((membership) => membership.productId === invite.productId)
    if (!alreadyJoined) {
        const founderProduct: FounderProductRecord = {
            id: randomUUID(),
            founderId: input.inviteeFounderId,
            productId: invite.productId,
            role: invite.role || "Co-Founder",
            isPrimary: false,
            createdAt: nowIso(),
        }

        await dynamo.send(new PutCommand({
            TableName: DYNAMO_TABLES.founderProducts,
            Item: founderProduct,
            ConditionExpression: "attribute_not_exists(#id)",
            ExpressionAttributeNames: {
                "#id": "id",
            },
        }))
    }

    return updateFounderInviteStatus({
        inviteId: invite.id,
        status: "ACCEPTED",
        inviteeUserId: input.inviteeUserId,
        inviteeFounderId: input.inviteeFounderId,
    })
}

export async function declineFounderInvite(input: {
    inviteId: string
    inviteeUserId?: string | null
    inviteeFounderId?: string | null
    inviteeEmail: string
}): Promise<FounderInviteRecord> {
    const invite = await getFounderInviteById(input.inviteId)
    if (!invite) {
        throw new Error("Invite not found")
    }
    if (normalizeEmail(invite.inviteeEmail) !== normalizeEmail(input.inviteeEmail)) {
        throw new Error("Invite email mismatch")
    }
    if (invite.status === "DECLINED") {
        return invite
    }
    if (invite.status !== "PENDING") {
        throw new Error("Invite is no longer pending")
    }

    return updateFounderInviteStatus({
        inviteId: invite.id,
        status: "DECLINED",
        inviteeUserId: input.inviteeUserId || null,
        inviteeFounderId: input.inviteeFounderId || null,
    })
}

export async function autoAcceptPendingFounderInvites(input: {
    inviteeEmail: string
    inviteeUserId: string
    inviteeFounderId: string
}): Promise<FounderInviteRecord[]> {
    const pendingInvites = await listPendingFounderInvitesByInviteeEmail(input.inviteeEmail)
    const accepted: FounderInviteRecord[] = []

    for (const invite of pendingInvites) {
        try {
            const result = await acceptFounderInvite({
                inviteId: invite.id,
                inviteeUserId: input.inviteeUserId,
                inviteeFounderId: input.inviteeFounderId,
                inviteeEmail: input.inviteeEmail,
            })
            accepted.push(result)
        } catch (error) {
            console.error("[AUTO_ACCEPT_FOUNDER_INVITE_ERROR]", {
                inviteId: invite.id,
                error,
            })
        }
    }

    return accepted
}

export async function deleteProductAndRelations(productId: string): Promise<void> {
    const product = await getProductById(productId)
    if (!product) {
        return
    }

    const founderRelations = await listFounderProductsByProductId(productId)
    const founderIds = Array.from(new Set(founderRelations.map((relation) => relation.founderId)))

    const [interests, invites] = await Promise.all([
        listInvestorInterestsByProductId(productId),
        listFounderInvitesByProductId(productId),
    ])

    const conversations: ConversationRecord[] = []
    let lastEvaluatedKey: Record<string, unknown> | undefined

    do {
        const response = await dynamo.send(new ScanCommand({
            TableName: DYNAMO_TABLES.conversations,
            FilterExpression: "#productId = :productId",
            ExpressionAttributeNames: {
                "#productId": "productId",
            },
            ExpressionAttributeValues: {
                ":productId": productId,
            },
            ExclusiveStartKey: lastEvaluatedKey,
        }))

        conversations.push(...((response.Items || []) as ConversationRecord[]))
        lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastEvaluatedKey)

    for (const conversation of conversations) {
        const messages = await listMessagesByConversationId(conversation.id)
        await Promise.all(
            messages.map((message) =>
                dynamo.send(new DeleteCommand({
                    TableName: DYNAMO_TABLES.messages,
                    Key: { id: message.id },
                }))
            )
        )
    }

    await Promise.all([
        ...founderRelations.map((relation) =>
            dynamo.send(new DeleteCommand({
                TableName: DYNAMO_TABLES.founderProducts,
                Key: { id: relation.id },
            }))
        ),
        ...interests.map((interest) =>
            dynamo.send(new DeleteCommand({
                TableName: DYNAMO_TABLES.investorInterests,
                Key: { id: interest.id },
            }))
        ),
        ...invites.map((invite) =>
            dynamo.send(new DeleteCommand({
                TableName: DYNAMO_TABLES.founderInvites,
                Key: { id: invite.id },
            }))
        ),
        ...conversations.map((conversation) =>
            dynamo.send(new DeleteCommand({
                TableName: DYNAMO_TABLES.conversations,
                Key: { id: conversation.id },
            }))
        ),
        dynamo.send(new DeleteCommand({
            TableName: DYNAMO_TABLES.products,
            Key: { id: productId },
        })),
    ])

    for (const founderId of founderIds) {
        const memberships = await listFounderProductsByFounderId(founderId)
        if (memberships.length === 0 || memberships.some((membership) => membership.isPrimary)) {
            continue
        }

        const nextPrimary = memberships[0]
        await dynamo.send(new UpdateCommand({
            TableName: DYNAMO_TABLES.founderProducts,
            Key: { id: nextPrimary.id },
            UpdateExpression: "SET #isPrimary = :true",
            ExpressionAttributeNames: {
                "#isPrimary": "isPrimary",
            },
            ExpressionAttributeValues: {
                ":true": true,
            },
        }))
    }
}

export async function getProductLikeState(input: {
    productId: string
    investorId?: string | null
}): Promise<{ likeCount: number; liked: boolean }> {
    const interests = await listInvestorInterestsByProductId(input.productId)
    const likes = interests.filter((interest) => interest.interestType === "LIKED")

    return {
        likeCount: likes.length,
        liked: input.investorId
            ? likes.some((interest) => interest.investorId === input.investorId)
            : false,
    }
}

export async function toggleProductLike(input: {
    productId: string
    investorId: string
    founderId?: string | null
}): Promise<{ likeCount: number; liked: boolean }> {
    const existingInterests = await listInvestorInterestsByProductId(input.productId)
    const existingLikes = existingInterests.filter(
        (interest) =>
            interest.interestType === "LIKED" &&
            interest.investorId === input.investorId
    )

    if (existingLikes.length > 0) {
        await Promise.all(
            existingLikes.map((interest) =>
                dynamo.send(new DeleteCommand({
                    TableName: DYNAMO_TABLES.investorInterests,
                    Key: { id: interest.id },
                }))
            )
        )
        return getProductLikeState({
            productId: input.productId,
            investorId: input.investorId,
        })
    }

    const interest: InvestorInterestRecord = {
        id: randomUUID(),
        investorId: input.investorId,
        founderId: input.founderId || null,
        productId: input.productId,
        interestType: "LIKED",
        amountCommitted: null,
        createdAt: nowIso(),
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        Item: interest,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return getProductLikeState({
        productId: input.productId,
        investorId: input.investorId,
    })
}

export function byIdMap<T extends { id: string }>(items: T[]): Map<string, T> {
    return new Map(items.map((item) => [item.id, item]))
}

// ============================================
// Messaging Functions
// ============================================

export async function createConversation(input: {
    investorId: string
    founderId: string
    productId: string
}): Promise<ConversationRecord> {
    const timestamp = nowIso()

    const conversation: ConversationRecord = {
        id: randomUUID(),
        investorId: input.investorId,
        founderId: input.founderId,
        productId: input.productId,
        lastMessageAt: timestamp,
        lastMessageSenderType: null,
        founderLastReadAt: timestamp,
        investorLastReadAt: timestamp,
        createdAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.conversations,
        Item: conversation,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: {
            "#id": "id",
        },
    }))

    return conversation
}

export async function getConversationById(id: string): Promise<ConversationRecord | null> {
    const conversation = await getSingleById<ConversationRecord>(DYNAMO_TABLES.conversations, id)
    return conversation ? normalizeConversation(conversation) : null
}

export async function getConversationByParticipants(input: {
    investorId: string
    founderId: string
    productId: string
}): Promise<ConversationRecord | null> {
    // Query by investorId first, then filter by founderId and productId
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.conversations,
        IndexName: DYNAMO_INDEXES.conversationsByInvestorId,
        KeyConditionExpression: "#investorId = :investorId",
        FilterExpression: "#founderId = :founderId AND #productId = :productId",
        ExpressionAttributeNames: {
            "#investorId": "investorId",
            "#founderId": "founderId",
            "#productId": "productId",
        },
        ExpressionAttributeValues: {
            ":investorId": input.investorId,
            ":founderId": input.founderId,
            ":productId": input.productId,
        },
        Limit: 1,
    }))

    const conversation = (response.Items?.[0] as ConversationRecord | undefined) || null
    return conversation ? normalizeConversation(conversation) : null
}

export async function listConversationsByInvestorId(investorId: string): Promise<ConversationRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.conversations,
        IndexName: DYNAMO_INDEXES.conversationsByInvestorId,
        KeyConditionExpression: "#investorId = :investorId",
        ExpressionAttributeNames: {
            "#investorId": "investorId",
        },
        ExpressionAttributeValues: {
            ":investorId": investorId,
        },
    }))

    const conversations = (response.Items || []) as ConversationRecord[]
    return sortConversationsByLastMessageAtDesc(conversations.map(normalizeConversation))
}

export async function listConversationsByFounderId(founderId: string): Promise<ConversationRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.conversations,
        IndexName: DYNAMO_INDEXES.conversationsByFounderId,
        KeyConditionExpression: "#founderId = :founderId",
        ExpressionAttributeNames: {
            "#founderId": "founderId",
        },
        ExpressionAttributeValues: {
            ":founderId": founderId,
        },
    }))

    const conversations = (response.Items || []) as ConversationRecord[]
    return sortConversationsByLastMessageAtDesc(conversations.map(normalizeConversation))
}

export async function createMessage(input: {
    conversationId: string
    senderId: string
    senderType: SenderType
    content: string
}): Promise<MessageRecord> {
    const timestamp = nowIso()

    const message: MessageRecord = {
        id: randomUUID(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        senderType: input.senderType,
        content: input.content,
        createdAt: timestamp,
    }

    const senderReadAtField =
        input.senderType === "FOUNDER"
            ? "founderLastReadAt"
            : "investorLastReadAt"
    const recipientReadAtField =
        input.senderType === "FOUNDER"
            ? "investorLastReadAt"
            : "founderLastReadAt"
    const unreadFallbackTimestamp = "1970-01-01T00:00:00.000Z"

    // Update conversation's message metadata and create message in transaction
    await dynamo.send(new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: DYNAMO_TABLES.messages,
                    Item: message,
                    ConditionExpression: "attribute_not_exists(#id)",
                    ExpressionAttributeNames: {
                        "#id": "id",
                    },
                },
            },
            {
                Update: {
                    TableName: DYNAMO_TABLES.conversations,
                    Key: { id: input.conversationId },
                    UpdateExpression: "SET #lastMessageAt = :timestamp, #lastMessageSenderType = :senderType, #senderReadAt = :timestamp, #recipientReadAt = if_not_exists(#recipientReadAt, :unreadFallbackTimestamp)",
                    ExpressionAttributeNames: {
                        "#lastMessageAt": "lastMessageAt",
                        "#lastMessageSenderType": "lastMessageSenderType",
                        "#senderReadAt": senderReadAtField,
                        "#recipientReadAt": recipientReadAtField,
                    },
                    ExpressionAttributeValues: {
                        ":timestamp": timestamp,
                        ":senderType": input.senderType,
                        ":unreadFallbackTimestamp": unreadFallbackTimestamp,
                    },
                },
            },
        ],
    }))

    return message
}

export async function listMessagesByConversationId(conversationId: string): Promise<MessageRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.messages,
        IndexName: DYNAMO_INDEXES.messagesByConversationId,
        KeyConditionExpression: "#conversationId = :conversationId",
        ExpressionAttributeNames: {
            "#conversationId": "conversationId",
        },
        ExpressionAttributeValues: {
            ":conversationId": conversationId,
        },
    }))

    // Sort by createdAt ascending (oldest first) for chat display
    const messages = (response.Items || []) as MessageRecord[]
    return messages.sort((a, b) => {
        const left = a.createdAt ? Date.parse(a.createdAt) : 0
        const right = b.createdAt ? Date.parse(b.createdAt) : 0
        return left - right
    })
}

export async function markConversationRead(input: {
    conversationId: string
    userType: SenderType
}): Promise<ConversationRecord> {
    const readAtField =
        input.userType === "FOUNDER"
            ? "founderLastReadAt"
            : "investorLastReadAt"
    const timestamp = nowIso()

    const response = await dynamo.send(new UpdateCommand({
        TableName: DYNAMO_TABLES.conversations,
        Key: { id: input.conversationId },
        UpdateExpression: "SET #readAtField = :timestamp",
        ExpressionAttributeNames: {
            "#readAtField": readAtField,
        },
        ExpressionAttributeValues: {
            ":timestamp": timestamp,
        },
        ReturnValues: "ALL_NEW",
    }))

    const updated = response.Attributes as ConversationRecord | undefined
    if (!updated) {
        throw new Error("Failed to mark conversation as read")
    }
    return normalizeConversation(updated)
}

const getLatestMessageSenderType = async (conversationId: string): Promise<SenderType | null> => {
    const messages = await listMessagesByConversationId(conversationId)
    const latestMessage = messages[messages.length - 1]
    return latestMessage?.senderType || null
}

const isUnreadByFounder = async (conversation: ConversationRecord): Promise<boolean> => {
    const senderType = conversation.lastMessageSenderType || await getLatestMessageSenderType(conversation.id)
    if (senderType !== "INVESTOR") {
        return false
    }

    const lastMessageAtMs = conversation.lastMessageAt ? Date.parse(conversation.lastMessageAt) : 0
    const founderLastReadAtMs = conversation.founderLastReadAt ? Date.parse(conversation.founderLastReadAt) : 0
    return lastMessageAtMs > founderLastReadAtMs
}

const isUnreadByInvestor = async (conversation: ConversationRecord): Promise<boolean> => {
    const senderType = conversation.lastMessageSenderType || await getLatestMessageSenderType(conversation.id)
    if (senderType !== "FOUNDER") {
        return false
    }

    const lastMessageAtMs = conversation.lastMessageAt ? Date.parse(conversation.lastMessageAt) : 0
    const investorLastReadAtMs = conversation.investorLastReadAt ? Date.parse(conversation.investorLastReadAt) : 0
    return lastMessageAtMs > investorLastReadAtMs
}

export async function countUnreadConversationsForFounder(founderId: string): Promise<number> {
    const conversations = await listConversationsByFounderId(founderId)
    let unreadCount = 0

    for (const conversation of conversations) {
        if (await isUnreadByFounder(conversation)) {
            unreadCount += 1
        }
    }

    return unreadCount
}

export async function countUnreadConversationsForInvestor(investorId: string): Promise<number> {
    const conversations = await listConversationsByInvestorId(investorId)
    let unreadCount = 0

    for (const conversation of conversations) {
        if (await isUnreadByInvestor(conversation)) {
            unreadCount += 1
        }
    }

    return unreadCount
}

export async function createInvestorInterest(input: {
    investorId: string
    founderId?: string | null
    productId?: string | null
    interestType: InterestType
    amountCommitted?: number | null
}): Promise<InvestorInterestRecord> {
    const timestamp = nowIso()

    const interest: InvestorInterestRecord = {
        id: randomUUID(),
        investorId: input.investorId,
        founderId: input.founderId || null,
        productId: input.productId || null,
        interestType: input.interestType,
        amountCommitted: input.amountCommitted || null,
        createdAt: timestamp,
    }

    await dynamo.send(new PutCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        Item: interest,
    }))

    return interest
}

export async function getInvestorInterestByInvestorAndProduct(
    investorId: string,
    productId: string
): Promise<InvestorInterestRecord | null> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        IndexName: DYNAMO_INDEXES.investorInterestsByProductId,
        KeyConditionExpression: "#productId = :productId",
        FilterExpression: "#investorId = :investorId",
        ExpressionAttributeNames: {
            "#productId": "productId",
            "#investorId": "investorId",
        },
        ExpressionAttributeValues: {
            ":productId": productId,
            ":investorId": investorId,
        },
        Limit: 1,
    }))

    return (response.Items?.[0] as InvestorInterestRecord | undefined) || null
}

export async function listInvestorInterestsByInvestorId(investorId: string): Promise<InvestorInterestRecord[]> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        IndexName: DYNAMO_INDEXES.investorInterestsByInvestorId,
        KeyConditionExpression: "#investorId = :investorId",
        ExpressionAttributeNames: {
            "#investorId": "investorId",
        },
        ExpressionAttributeValues: {
            ":investorId": investorId,
        },
    }))

    return (response.Items || []) as InvestorInterestRecord[]
}

/**
 * Check if an investor has expressed interest (LIKED or COMMITTED) in a founder's product.
 * This is used to determine if a founder can message an investor.
 */
export async function hasInvestorInterestInFounder(
    investorId: string,
    founderId: string
): Promise<boolean> {
    const response = await dynamo.send(new QueryCommand({
        TableName: DYNAMO_TABLES.investorInterests,
        IndexName: DYNAMO_INDEXES.investorInterestsByFounderId,
        KeyConditionExpression: "#founderId = :founderId",
        FilterExpression: "#investorId = :investorId",
        ExpressionAttributeNames: {
            "#founderId": "founderId",
            "#investorId": "investorId",
        },
        ExpressionAttributeValues: {
            ":founderId": founderId,
            ":investorId": investorId,
        },
        Limit: 1,
    }))

    return (response.Items?.length || 0) > 0
}
