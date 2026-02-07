import { Founder, Product, WorkExperience, Skill, FounderProduct } from '@prisma/client'

export type FounderWithRelations = Founder & {
    products: (FounderProduct & {
        product: Product
    })[]
    workExperience: WorkExperience[]
    skills: Skill[]
    _count?: {
        investorInterests: number
    }
}

export interface InvestorStats {
    likeCount: number
    committedCount: number
    totalCommitted: number
}
