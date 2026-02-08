import { Founder, Product, WorkExperience, Skill, FounderProduct, FounderPhoto, FounderPrompt, Investor, PortfolioCompany, InvestorInterestTag } from '@prisma/client'

export type FounderWithRelations = Founder & {
    products: (FounderProduct & {
        product: Product
    })[]
    workExperience: WorkExperience[]
    skills: Skill[]
    photos: FounderPhoto[]
    prompts: FounderPrompt[]
    _count?: {
        investorInterests: number
    }
}

export interface InvestorStats {
    likeCount: number
    committedCount: number
    totalCommitted: number
}

export type InvestorWithRelations = Investor & {
    portfolio: PortfolioCompany[]
    interestTags: InvestorInterestTag[]
}
