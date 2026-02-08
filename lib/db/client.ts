import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const readEnv = (name: string): string | undefined => {
    const value = process.env[name]
    if (!value) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

const region = readEnv("AWS_REGION") || readEnv("AWS_DEFAULT_REGION") || "us-east-2"
const endpoint = readEnv("AWS_DYNAMODB_ENDPOINT")
const profile = readEnv("AWS_PROFILE")
const accessKeyId = readEnv("AWS_ACCESS_KEY_ID")
const secretAccessKey = readEnv("AWS_SECRET_ACCESS_KEY")
const sessionToken = readEnv("AWS_SESSION_TOKEN")

const hasStaticCredentials = Boolean(!profile && accessKeyId && secretAccessKey)

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
