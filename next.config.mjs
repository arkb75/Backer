const toRemotePattern = (urlString) => {
    try {
        const parsed = new URL(urlString)
        const pathname = parsed.pathname && parsed.pathname !== "/"
            ? `${parsed.pathname.replace(/\/+$/, "")}/**`
            : "/**"

        return {
            protocol: parsed.protocol.replace(":", ""),
            hostname: parsed.hostname,
            port: parsed.port,
            pathname,
        }
    } catch {
        return null
    }
}

const buildRemotePatterns = () => {
    const patterns = []

    if (process.env.AWS_S3_PUBLIC_URL) {
        const pattern = toRemotePattern(process.env.AWS_S3_PUBLIC_URL)
        if (pattern) patterns.push(pattern)
    }

    if (process.env.AWS_S3_ENDPOINT) {
        const endpointPattern = toRemotePattern(process.env.AWS_S3_ENDPOINT)
        if (endpointPattern) patterns.push(endpointPattern)
    }

    if (process.env.AWS_S3_BUCKET && process.env.AWS_REGION) {
        const bucket = process.env.AWS_S3_BUCKET
        const region = process.env.AWS_REGION

        patterns.push({
            protocol: "https",
            hostname: `${bucket}.s3.${region}.amazonaws.com`,
            pathname: "/**",
        })

        if (region === "us-east-1") {
            patterns.push({
                protocol: "https",
                hostname: `${bucket}.s3.amazonaws.com`,
                pathname: "/**",
            })
        }
    }

    return patterns
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: buildRemotePatterns(),
    },
}

export default nextConfig
