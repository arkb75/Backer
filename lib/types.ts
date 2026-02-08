import type {
    FounderProductRecord,
    FounderPromptRecord,
    FounderPhotoRecord,
    FounderRecord,
    InvestorRecord,
    InvestorInterestTagRecord,
    PortfolioCompanyRecord,
    ProductRecord,
    SkillRecord,
    WorkExperienceRecord,
} from "@/lib/db/types"

export type FounderWithRelations = FounderRecord & {
    products: (FounderProductRecord & {
        product: ProductRecord
    })[]
    workExperience: WorkExperienceRecord[]
    skills: SkillRecord[]
    photos: FounderPhotoRecord[]
    prompts: FounderPromptRecord[]
    _count?: {
        investorInterests: number
    }
}

export interface InvestorStats {
    likeCount: number
    committedCount: number
    totalCommitted: number
}

export type InvestorWithRelations = InvestorRecord & {
    portfolio: PortfolioCompanyRecord[]
    interestTags: InvestorInterestTagRecord[]
}
