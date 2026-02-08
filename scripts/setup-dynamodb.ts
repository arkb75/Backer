import "dotenv/config"
import {
    CreateTableCommand,
    DescribeTableCommand,
    DynamoDBClient,
    waitUntilTableExists,
    type AttributeDefinition,
    type KeySchemaElement,
} from "@aws-sdk/client-dynamodb"

type GsiDefinition = {
    name: string
    partitionKey: string
}

type TableDefinition = {
    envName: string
    fallbackName: string
    gsi?: GsiDefinition[]
}

const readEnv = (name: string, fallback: string): string => {
    const value = process.env[name]
    if (!value) return fallback
    const trimmed = value.trim()
    return trimmed || fallback
}

const region = readEnv("AWS_REGION", "us-east-2")

const tables: TableDefinition[] = [
    {
        envName: "DYNAMODB_TABLE_USERS",
        fallbackName: "backer-dev-users",
        gsi: [{ name: "email-index", partitionKey: "email" }],
    },
    {
        envName: "DYNAMODB_TABLE_FOUNDERS",
        fallbackName: "backer-dev-founders",
        gsi: [{ name: "userId-index", partitionKey: "userId" }],
    },
    {
        envName: "DYNAMODB_TABLE_PRODUCTS",
        fallbackName: "backer-dev-products",
    },
    {
        envName: "DYNAMODB_TABLE_FOUNDER_PRODUCTS",
        fallbackName: "backer-dev-founder-products",
        gsi: [
            { name: "founderId-index", partitionKey: "founderId" },
            { name: "productId-index", partitionKey: "productId" },
        ],
    },
    {
        envName: "DYNAMODB_TABLE_FOUNDER_INVITES",
        fallbackName: "backer-dev-founder-invites",
        gsi: [
            { name: "inviteeEmail-index", partitionKey: "inviteeEmail" },
            { name: "inviterFounderId-index", partitionKey: "inviterFounderId" },
            { name: "productId-index", partitionKey: "productId" },
        ],
    },
    {
        envName: "DYNAMODB_TABLE_INVESTORS",
        fallbackName: "backer-dev-investors",
        gsi: [{ name: "userId-index", partitionKey: "userId" }],
    },
    {
        envName: "DYNAMODB_TABLE_INVESTOR_INTERESTS",
        fallbackName: "backer-dev-investor-interests",
        gsi: [
            { name: "founderId-index", partitionKey: "founderId" },
            { name: "productId-index", partitionKey: "productId" },
        ],
    },
    {
        envName: "DYNAMODB_TABLE_CONVERSATIONS",
        fallbackName: "backer-dev-conversations",
        gsi: [
            { name: "investorId-index", partitionKey: "investorId" },
            { name: "founderId-index", partitionKey: "founderId" },
        ],
    },
    {
        envName: "DYNAMODB_TABLE_MESSAGES",
        fallbackName: "backer-dev-messages",
        gsi: [
            { name: "conversationId-index", partitionKey: "conversationId" },
        ],
    },
]

const client = new DynamoDBClient({
    region,
    ...(process.env.AWS_DYNAMODB_ENDPOINT
        ? { endpoint: process.env.AWS_DYNAMODB_ENDPOINT }
        : {}),
})

const tableExists = async (tableName: string): Promise<boolean> => {
    try {
        await client.send(new DescribeTableCommand({ TableName: tableName }))
        return true
    } catch (error) {
        const code = (error as { name?: string })?.name
        if (code === "ResourceNotFoundException") {
            return false
        }
        throw error
    }
}

const createTable = async (tableName: string, gsi: GsiDefinition[] = []) => {
    const attributeNames = new Set<string>(["id"])
    for (const index of gsi) {
        attributeNames.add(index.partitionKey)
    }

    const attributeDefinitions: AttributeDefinition[] = Array.from(attributeNames).map((name) => ({
        AttributeName: name,
        AttributeType: "S",
    }))

    const keySchema: KeySchemaElement[] = [
        { AttributeName: "id", KeyType: "HASH" },
    ]

    await client.send(new CreateTableCommand({
        TableName: tableName,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: attributeDefinitions,
        KeySchema: keySchema,
        ...(gsi.length > 0
            ? {
                GlobalSecondaryIndexes: gsi.map((index) => ({
                    IndexName: index.name,
                    KeySchema: [{ AttributeName: index.partitionKey, KeyType: "HASH" }],
                    Projection: { ProjectionType: "ALL" },
                })),
            }
            : {}),
    }))

    await waitUntilTableExists(
        { client, maxWaitTime: 120 },
        { TableName: tableName }
    )
}

const main = async () => {
    console.log(`Using AWS region: ${region}`)
    console.log("Ensuring DynamoDB tables exist...")

    for (const definition of tables) {
        const tableName = readEnv(definition.envName, definition.fallbackName)
        const exists = await tableExists(tableName)

        if (exists) {
            console.log(`- ${tableName} already exists`)
            continue
        }

        console.log(`- creating ${tableName}`)
        await createTable(tableName, definition.gsi || [])
        console.log(`  created ${tableName}`)
    }

    console.log("DynamoDB setup complete.")
}

main().catch((error) => {
    console.error("Failed to set up DynamoDB tables.")
    console.error(error)
    process.exit(1)
})
