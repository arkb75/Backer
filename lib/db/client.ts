import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-2"
const endpoint = process.env.AWS_DYNAMODB_ENDPOINT?.trim()
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
const sessionToken = process.env.AWS_SESSION_TOKEN?.trim()

const hasStaticCredentials = Boolean(accessKeyId && secretAccessKey)

const client = new DynamoDBClient({
    region,
    ...(hasStaticCredentials
        ? {
            credentials: {
                accessKeyId: accessKeyId as string,
                secretAccessKey: secretAccessKey as string,
                ...(sessionToken ? { sessionToken } : {}),
            },
        }
        : {}),
    ...(endpoint ? { endpoint } : {}),
})

export const dynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    },
})
