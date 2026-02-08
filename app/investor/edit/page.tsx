import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getInvestorByUserId } from "@/lib/db/repository"
import InvestorEditForm from "@/components/investor/InvestorEditForm"

export const dynamic = "force-dynamic"

export default async function InvestorEditPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "INVESTOR") {
        redirect("/")
    }

    const investor = await getInvestorByUserId(session.user.id)
    if (!investor) {
        redirect("/investor/onboarding")
    }

    return (
        <main style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: "24px" }}>
            <InvestorEditForm investor={investor} />
        </main>
    )
}
