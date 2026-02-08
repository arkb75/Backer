import CompanyWizard from "@/components/company/CompanyWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"
import { getFounderByUserId } from "@/lib/db/repository"

export default async function StartCompanyPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect('/')
    }

    const founder = await getFounderByUserId(session.user.id)

    if (!founder) {
        redirect('/onboarding')
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '24px', paddingBottom: '24px' }}>
            <FounderControls />
            <CompanyWizard />
        </div>
    )
}
