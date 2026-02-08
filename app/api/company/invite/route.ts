import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
    createFounderInvite,
    getFounderByUserId,
    getProductById,
    getUserByEmail,
    getUserById,
    listFounderProductsByFounderId,
} from "@/lib/db/repository"
import { sendCofounderInviteEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.userType !== "FOUNDER") {
            return NextResponse.json({ error: "Only founders can send invites" }, { status: 403 })
        }

        const founder = await getFounderByUserId(session.user.id)
        if (!founder) {
            return NextResponse.json(
                { error: "Complete founder onboarding before sending invites" },
                { status: 400 }
            )
        }

        const body = await req.json()
        const productId = typeof body?.productId === "string" ? body.productId.trim() : ""
        const inviteeEmailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
        const role = typeof body?.role === "string" ? body.role.trim() : "Co-Founder"
        const message = typeof body?.message === "string" ? body.message.trim() : ""

        if (!productId || !inviteeEmailRaw) {
            return NextResponse.json({ error: "Product and email are required" }, { status: 400 })
        }
        if (!EMAIL_REGEX.test(inviteeEmailRaw)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
        }

        const inviterUser = await getUserById(session.user.id)
        if (inviterUser && inviterUser.email.toLowerCase() === inviteeEmailRaw) {
            return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 })
        }

        const memberships = await listFounderProductsByFounderId(founder.id)
        const hasAccess = memberships.some((membership) => membership.productId === productId)
        if (!hasAccess) {
            return NextResponse.json({ error: "You can only invite co-founders to your own company" }, { status: 403 })
        }

        const product = await getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 })
        }

        const existingUser = await getUserByEmail(inviteeEmailRaw)
        const invite = await createFounderInvite({
            productId: product.id,
            productName: product.name,
            inviterFounderId: founder.id,
            inviterFounderName: founder.name,
            inviteeEmail: inviteeEmailRaw,
            role,
            message: message || null,
        })

        const emailResult = await sendCofounderInviteEmail({
            toEmail: inviteeEmailRaw,
            inviterFounderName: founder.name,
            productName: product.name,
            role: role || "Co-Founder",
            message: message || null,
            hasExistingAccount: Boolean(existingUser),
        })

        return NextResponse.json({
            invite,
            hasExistingAccount: Boolean(existingUser),
            emailSent: emailResult.sent,
            emailReason: emailResult.reason || null,
        })
    } catch (error: unknown) {
        console.error("[COMPANY_INVITE_ERROR]", error)
        const message = error instanceof Error ? error.message : "Failed to send invite"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
