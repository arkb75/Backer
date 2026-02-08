import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-2"
const endpoint = process.env.AWS_DYNAMODB_ENDPOINT?.trim()

const client = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
})

export const dynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    },
})
