import InvestorOnboardingWizard from "@/components/onboarding/InvestorOnboardingWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getInvestorByUserId } from "@/lib/db/repository"

export default async function InvestorOnboardingPage() {
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
        // Check if investor profile already exists
        const existingInvestor = await getInvestorByUserId(session.user.id)

        if (existingInvestor) {
            // Already onboarded, redirect to their profile
            redirect(`/investor/${existingInvestor.id}`)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '40px' }}>
            <InvestorOnboardingWizard />
        </div>
    )
}
