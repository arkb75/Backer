import { prisma } from '@/lib/prisma'
import { InvestorWithRelations } from '@/lib/types'
import InvestorProfile from '@/components/investor/InvestorProfile'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function InvestorPage({ params }: PageProps) {
    const { id } = await params

    // Fetch investor with all relations
    const investor = await prisma.investor.findUnique({
        where: { id },
        include: {
            portfolio: true,
            interestTags: true,
        },
    })

    if (!investor) {
        notFound()
    }

    return (
        <main>
            <InvestorProfile investor={investor as InvestorWithRelations} />
        </main>
    )
}
