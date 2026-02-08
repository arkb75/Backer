import OnboardingWizard from "@/components/onboarding/OnboardingWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
        // Check if founder profile already exists
        const existingFounder = await prisma.founder.findUnique({
            where: { userId: session.user.id }
        })

        if (existingFounder) {
            // Already onboarded, redirect to their profile or feed
            redirect(`/founder/${existingFounder.id}`)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '40px' }}>
            <OnboardingWizard />
        </div>
    )
}
