import CompanyWizard from "@/components/company/CompanyWizard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import FounderControls from "@/components/founder/FounderControls"

export default async function StartCompanyPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect('/')
    }

    const founder = await prisma.founder.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })

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
