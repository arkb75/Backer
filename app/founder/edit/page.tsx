import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getFounderByUserId } from "@/lib/db/repository"
import FounderEditForm from "@/components/founder/FounderEditForm"

export const dynamic = "force-dynamic"

export default async function FounderEditPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "FOUNDER") {
        redirect("/")
    }

    const founder = await getFounderByUserId(session.user.id)
    if (!founder) {
        redirect("/onboarding")
    }

    return (
        <main style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: "24px" }}>
            <FounderEditForm founder={founder} />
        </main>
    )
}
