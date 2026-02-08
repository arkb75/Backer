import CompanyWizard from "@/components/company/CompanyWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"

export default async function StartCompanyPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect('/')
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafe', paddingTop: '40px' }}>
            <FounderControls />
            <CompanyWizard />
        </div>
    )
}
