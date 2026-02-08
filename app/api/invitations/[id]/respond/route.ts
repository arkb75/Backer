import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
    acceptFounderInvite,
    declineFounderInvite,
    getFounderByUserId,
    getUserById,
} from "@/lib/db/repository"

export const dynamic = "force-dynamic"

interface RouteContext {
    params: {
        id: string
    }
}

export async function POST(req: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await getUserById(session.user.id)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const body = await req.json().catch(() => ({}))
        const action = typeof body?.action === "string" ? body.action.toLowerCase() : "accept"
        const inviteId = context.params.id

        if (action !== "accept" && action !== "decline") {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        if (action === "decline") {
            const founder = await getFounderByUserId(session.user.id)
            const invite = await declineFounderInvite({
                inviteId,
                inviteeEmail: user.email,
                inviteeUserId: user.id,
                inviteeFounderId: founder?.id || null,
            })
            return NextResponse.json({ invite })
        }

        const founder = await getFounderByUserId(session.user.id)
        if (!founder) {
            return NextResponse.json(
                {
                    error: "Complete founder onboarding to accept this invite",
                    code: "FOUNDER_ONBOARDING_REQUIRED",
                },
                { status: 400 }
            )
        }

        const invite = await acceptFounderInvite({
            inviteId,
            inviteeEmail: user.email,
            inviteeUserId: user.id,
            inviteeFounderId: founder.id,
        })
        return NextResponse.json({ invite })
    } catch (error) {
        console.error("[INVITE_RESPOND_ERROR]", error)
        const message = error instanceof Error ? error.message : "Failed to respond to invite"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
