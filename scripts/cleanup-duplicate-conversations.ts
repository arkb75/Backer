import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-2",
})

const dynamo = DynamoDBDocumentClient.from(client)

const tableName = process.env.DYNAMODB_TABLE_CONVERSATIONS || "backer-dev-conversations"

async function cleanupDuplicateConversations() {
    console.log("Scanning for duplicate conversations...")

    // Scan all conversations
    const result = await dynamo.send(new ScanCommand({
        TableName: tableName,
    }))

    const conversations = result.Items || []
    console.log(`Found ${conversations.length} total conversations`)

    // Group by composite key (investorId + founderId + productId)
    const grouped = new Map<string, any[]>()

    for (const conv of conversations) {
        const key = `${conv.investorId}#${conv.founderId}#${conv.productId}`
        if (!grouped.has(key)) {
            grouped.set(key, [])
        }
        grouped.get(key)!.push(conv)
    }

    // Find duplicates
    let duplicatesFound = 0
    let duplicatesDeleted = 0

    for (const [key, convs] of Array.from(grouped.entries())) {
        if (convs.length > 1) {
            duplicatesFound += convs.length - 1
            console.log(`\nFound ${convs.length} conversations for ${key}:`)

            // Sort by createdAt to keep the oldest one
            convs.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

            console.log(`  Keeping: ${convs[0].id} (created: ${convs[0].createdAt})`)

            // Delete all but the first (oldest) one
            for (let i = 1; i < convs.length; i++) {
                console.log(`  Deleting: ${convs[i].id} (created: ${convs[i].createdAt})`)

                try {
                    await dynamo.send(new DeleteCommand({
                        TableName: tableName,
                        Key: { id: convs[i].id },
                    }))
                    duplicatesDeleted++
                } catch (error) {
                    console.error(`  Error deleting ${convs[i].id}:`, error)
                }
            }
        }
    }

    console.log(`\n✅ Cleanup complete!`)
    console.log(`   Total conversations: ${conversations.length}`)
    console.log(`   Duplicates found: ${duplicatesFound}`)
    console.log(`   Duplicates deleted: ${duplicatesDeleted}`)
    console.log(`   Remaining conversations: ${conversations.length - duplicatesDeleted}`)
}

cleanupDuplicateConversations()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error)
        process.exit(1)
    })
