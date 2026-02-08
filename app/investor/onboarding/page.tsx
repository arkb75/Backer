import InvestorOnboardingWizard from "@/components/onboarding/InvestorOnboardingWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function InvestorOnboardingPage() {
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
        // Check if investor profile already exists
        const existingInvestor = await prisma.investor.findUnique({
            where: { userId: session.user.id }
        })

        if (existingInvestor) {
            // Already onboarded, redirect to their profile
            redirect(`/investor/${existingInvestor.id}`)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '40px' }}>
            <InvestorOnboardingWizard />
        </div>
    )
}
