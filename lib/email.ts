import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

const readEnv = (name: string): string | undefined => {
    const value = process.env[name]
    if (!value) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

const region = readEnv("AWS_REGION") || readEnv("AWS_DEFAULT_REGION") || "us-east-2"
const profile = readEnv("AWS_PROFILE")
const accessKeyId = readEnv("AWS_ACCESS_KEY_ID")
const secretAccessKey = readEnv("AWS_SECRET_ACCESS_KEY")
const sessionToken = readEnv("AWS_SESSION_TOKEN")
const fromAddress = readEnv("EMAIL_FROM_ADDRESS")
const appBaseUrl = (readEnv("APP_BASE_URL") || readEnv("NEXTAUTH_URL") || "http://localhost:3000").replace(/\/+$/, "")
const hasStaticCredentials = Boolean(!profile && accessKeyId && secretAccessKey)

const sesClient = new SESClient({
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
})

export async function sendCofounderInviteEmail(input: {
    toEmail: string
    inviterFounderName: string
    productName: string
    role: string
    message?: string | null
    hasExistingAccount: boolean
}): Promise<{ sent: boolean; reason?: string }> {
    if (!fromAddress) {
        return { sent: false, reason: "Missing EMAIL_FROM_ADDRESS environment variable" }
    }

    const actionUrl = `${appBaseUrl}${input.hasExistingAccount ? "/login" : "/register"}`
    const subject = `${input.inviterFounderName} invited you to join ${input.productName}`
    const messageBlock = input.message?.trim()
        ? `\nMessage from ${input.inviterFounderName}: ${input.message.trim()}\n`
        : ""

    const textBody = [
        `You have been invited to join ${input.productName} as ${input.role}.`,
        messageBlock.trim(),
        input.hasExistingAccount
            ? "Sign in to your Backer account to review and respond to the invite."
            : "Create your Backer account, complete founder onboarding, and the company will be linked automatically.",
        `Open Backer: ${actionUrl}`,
    ].filter(Boolean).join("\n\n")

    const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #101828;">
            <p>You have been invited to join <strong>${escapeHtml(input.productName)}</strong> as <strong>${escapeHtml(input.role)}</strong>.</p>
            ${messageBlock ? `<p><strong>Message from ${escapeHtml(input.inviterFounderName)}:</strong><br/>${escapeHtml(input.message || "")}</p>` : ""}
            <p>
                ${input.hasExistingAccount
                    ? "Sign in to your Backer account to review and respond to the invite."
                    : "Create your Backer account, complete founder onboarding, and the company will be linked automatically."}
            </p>
            <p><a href="${actionUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;">Open Backer</a></p>
        </div>
    `

    try {
        await sesClient.send(new SendEmailCommand({
            Source: fromAddress,
            Destination: {
                ToAddresses: [input.toEmail],
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: "UTF-8",
                },
                Body: {
                    Text: {
                        Data: textBody,
                        Charset: "UTF-8",
                    },
                    Html: {
                        Data: htmlBody,
                        Charset: "UTF-8",
                    },
                },
            },
        }))

        return { sent: true }
    } catch (error) {
        console.error("[SEND_COFOUNDER_INVITE_EMAIL_ERROR]", error)
        return { sent: false, reason: error instanceof Error ? error.message : "Failed to send email" }
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}
