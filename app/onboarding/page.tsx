import OnboardingWizard from "@/components/onboarding/OnboardingWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"
import { getFounderByUserId } from "@/lib/db/repository"

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
        // Check if founder profile already exists
        const existingFounder = await getFounderByUserId(session.user.id)

        if (existingFounder) {
            // Already onboarded, redirect to their profile or feed
            redirect(`/founder/${existingFounder.id}`)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '40px' }}>
            <FounderControls />
            <OnboardingWizard />
        </div>
    )
}
