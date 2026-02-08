import { InvestorWithRelations } from '@/lib/types'
import InvestorProfile from '@/components/investor/InvestorProfile'
import { notFound } from 'next/navigation'
import { getInvestorById } from '@/lib/db/repository'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function InvestorPage({ params }: PageProps) {
    const { id } = await params

    const investor = await getInvestorById(id)

    if (!investor) {
        notFound()
    }

    return (
        <main>
            <InvestorProfile investor={investor as InvestorWithRelations} />
        </main>
    )
}
