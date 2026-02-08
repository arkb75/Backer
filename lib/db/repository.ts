import { randomUUID } from "crypto"
import {
    BatchGetCommand,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb"
import { dynamo } from "@/lib/db/client"
import { DYNAMO_INDEXES, DYNAMO_TABLES } from "@/lib/db/config"
import type {
    FounderPhotoRecord,
    FounderProductRecord,
    FounderPromptRecord,
    FounderRecord,
    FounderType,
    InterestType,
    InvestmentStage,
    InvestorInterestRecord,
    InvestorInterestTagRecord,
    InvestorRecord,
    PortfolioCompanyRecord,
    ProductRecord,
    ProductStatus,
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

export function byIdMap<T extends { id: string }>(items: T[]): Map<string, T> {
    return new Map(items.map((item) => [item.id, item]))
}
