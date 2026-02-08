import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

export const runtime = "nodejs"

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
const DEFAULT_UPLOAD_PREFIX = "uploads"
const ALLOWED_FILE_TYPE_PREFIXES = ["image/", "video/"] as const

const readEnv = (name: string): string | undefined => {
    const value = process.env[name]
    if (!value) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

const sanitizeFilename = (filename: string): string => {
    const normalized = filename
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 80)

    return normalized || "upload"
}

const buildPublicObjectUrl = ({
    bucket,
    region,
    key,
    endpoint,
    publicBaseUrl,
    forcePathStyleUrl,
}: {
    bucket: string
    region: string
    key: string
    endpoint?: string
    publicBaseUrl?: string
    forcePathStyleUrl: boolean
}): string => {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/")

    if (publicBaseUrl) {
        return `${publicBaseUrl.replace(/\/+$/, "")}/${encodedKey}`
    }

    if (endpoint && forcePathStyleUrl) {
        return `${endpoint.replace(/\/+$/, "")}/${bucket}/${encodedKey}`
    }

    if (region === "us-east-1") {
        return `https://${bucket}.s3.amazonaws.com/${encodedKey}`
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`
}

const bucket = readEnv("AWS_S3_BUCKET")
const region = readEnv("AWS_REGION")
const endpoint = readEnv("AWS_S3_ENDPOINT")
const publicBaseUrl = readEnv("AWS_S3_PUBLIC_URL")
const uploadPrefix = readEnv("AWS_S3_UPLOAD_PREFIX") || DEFAULT_UPLOAD_PREFIX
const forcePathStyle = readEnv("AWS_S3_FORCE_PATH_STYLE") === "true"

const accessKeyId = readEnv("AWS_ACCESS_KEY_ID")
const secretAccessKey = readEnv("AWS_SECRET_ACCESS_KEY")

const s3Client = bucket && region
    ? new S3Client({
        region,
        endpoint,
        forcePathStyle,
        ...(accessKeyId && secretAccessKey
            ? {
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            }
            : {}),
    })
    : null

const validateUploadConfig = (): string | null => {
    if (!bucket) return "Missing AWS_S3_BUCKET environment variable"
    if (!region) return "Missing AWS_REGION environment variable"
    if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
        return "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together"
    }
    if (!s3Client) return "S3 client is not configured"
    return null
}

export async function POST(request: Request) {
    try {
        const configError = validateUploadConfig()
        if (configError) {
            console.error("[UPLOAD_CONFIG_ERROR]", configError)
            return NextResponse.json({ error: configError }, { status: 500 })
        }

        const configuredS3Client = s3Client
        if (!configuredS3Client) {
            return NextResponse.json({ error: "S3 client is not configured" }, { status: 500 })
        }

        const bucketName = bucket as string
        const awsRegion = region as string

        const data = await request.formData()
        const file = data.get("file")

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        if (!ALLOWED_FILE_TYPE_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
            return NextResponse.json({ error: "Only image and video uploads are supported" }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: "File is too large. Maximum allowed size is 100MB" },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const body = Buffer.from(bytes)
        const safeName = sanitizeFilename(file.name)
        const folder = file.type.startsWith("video/") ? "videos" : "images"
        const key = `${uploadPrefix.replace(/\/+$/, "")}/${folder}/${Date.now()}-${randomUUID()}-${safeName}`

        await configuredS3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: file.type || "application/octet-stream",
            CacheControl: "public, max-age=31536000, immutable",
        }))

        const url = buildPublicObjectUrl({
            bucket: bucketName,
            region: awsRegion,
            key,
            endpoint,
            publicBaseUrl,
            forcePathStyleUrl: forcePathStyle,
        })

        return NextResponse.json({ url, key })
    } catch (error) {
        console.error("[UPLOAD_ERROR]", error)
        return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }
}
