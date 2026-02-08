import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
    getFounderByUserId,
    getUserById,
    listPendingFounderInvitesByInviteeEmail,
} from "@/lib/db/repository"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await getUserById(session.user.id)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const founder = await getFounderByUserId(session.user.id)
        const invites = await listPendingFounderInvitesByInviteeEmail(user.email)

        return NextResponse.json({
            invites,
            canRespond: Boolean(founder),
        })
    } catch (error) {
        console.error("[INVITATIONS_LIST_ERROR]", error)
        return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 })
    }
}
