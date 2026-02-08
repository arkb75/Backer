import OnboardingWizard from "@/components/onboarding/OnboardingWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"
import {
    getFounderByUserId,
    getUserById,
    listPendingFounderInvitesByInviteeEmail,
} from "@/lib/db/repository"

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions)
    let pendingInviteCount = 0

    if (session?.user?.id) {
        // Check if founder profile already exists
        const existingFounder = await getFounderByUserId(session.user.id)

        if (existingFounder) {
            // Already onboarded, redirect to their profile or feed
            redirect(`/founder/${existingFounder.id}`)
        }

        const user = await getUserById(session.user.id)
        if (user) {
            const pendingInvites = await listPendingFounderInvitesByInviteeEmail(user.email)
            pendingInviteCount = pendingInvites.length
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '40px' }}>
            <FounderControls />
            {pendingInviteCount > 0 && (
                <div style={{
                    width: 'min(100%, 720px)',
                    margin: '0 auto 16px auto',
                    background: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    color: '#312e81',
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontSize: 14,
                    lineHeight: 1.45,
                }}>
                    You have {pendingInviteCount} pending co-founder invite{pendingInviteCount > 1 ? 's' : ''}. Complete onboarding and your company memberships will be added automatically.
                </div>
            )}
            <OnboardingWizard />
        </div>
    )
}
