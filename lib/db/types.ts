export type UserType = "FOUNDER" | "INVESTOR"

export type FounderType = "FIRST_TIME" | "SERIAL" | "EXITED"

export type ProductStatus = "IDEA" | "BUILDING" | "LAUNCHED" | "RAISING" | "FUNDED"

export type InvestmentStage = "SEED" | "SERIES_A" | "SERIES_B" | "GROWTH"

export type InterestType = "LIKED" | "COMMITTED"

export type FounderInviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED"

export interface UserRecord {
    id: string
    email: string
    passwordHash: string
    userType: UserType
    createdAt: string
    updatedAt: string
}

export interface WorkExperienceRecord {
    id: string
    company: string
    role: string
    years: string
    order: number
    createdAt: string
}

export interface SkillRecord {
    id: string
    name: string
    createdAt: string
}

export interface FounderPhotoRecord {
    id: string
    url: string
    order: number
    caption?: string | null
    createdAt: string
}

export interface FounderPromptRecord {
    id: string
    prompt: string
    answer: string
    order: number
    createdAt: string
}

export interface FounderRecord {
    id: string
    userId: string
    name: string
    headline: string
    location: string
    bio: string
    videoUrl?: string | null
    founderType: FounderType
    yearsExperience?: number | null
    linkedinUrl?: string | null
    twitterUrl?: string | null
    websiteUrl?: string | null
    workExperience: WorkExperienceRecord[]
    skills: SkillRecord[]
    photos: FounderPhotoRecord[]
    prompts: FounderPromptRecord[]
    createdAt: string
    updatedAt: string
}

export interface ProductRecord {
    id: string
    name: string
    tagline: string
    description?: string | null
    problem?: string | null
    solution?: string | null
    videoUrl?: string | null
    logoUrl?: string | null
    websiteUrl?: string | null
    status: ProductStatus
    stage?: string | null
    askAmount?: number | null
    amountRaised: number
    customSections?: Array<{
        title?: string
        body?: string
        imageUrl?: string
        caption?: string
    }>
    createdAt: string
    updatedAt: string
}

export interface FounderProductRecord {
    id: string
    founderId: string
    productId: string
    role: string
    isPrimary: boolean
    createdAt: string
}

export interface PortfolioCompanyRecord {
    id: string
    name: string
    logoUrl?: string | null
    stage: InvestmentStage
    isExited: boolean
    exitYear?: number | null
    order: number
    createdAt: string
}

export interface InvestorInterestTagRecord {
    id: string
    name: string
    createdAt: string
}

export interface InvestorRecord {
    id: string
    userId: string
    name: string
    firmName?: string | null
    title?: string | null
    bio?: string | null
    profileImage?: string | null
    location?: string | null
    investmentStagePreference?: InvestmentStage | null
    linkedinUrl?: string | null
    twitterUrl?: string | null
    websiteUrl?: string | null
    portfolio: PortfolioCompanyRecord[]
    interestTags: InvestorInterestTagRecord[]
    createdAt: string
    updatedAt: string
}

export interface InvestorInterestRecord {
    id: string
    investorId: string
    founderId?: string | null
    productId?: string | null
    interestType: InterestType
    amountCommitted?: number | null
    createdAt: string
}

export type SenderType = "INVESTOR" | "FOUNDER"

export interface ConversationRecord {
    id: string
    investorId: string
    founderId: string
    productId: string
    lastMessageAt: string
    createdAt: string
}

export interface MessageRecord {
    id: string
    conversationId: string
    senderId: string
    senderType: SenderType
    content: string
    createdAt: string
}

export interface FounderInviteRecord {
    id: string
    productId: string
    productName: string
    inviterFounderId: string
    inviterFounderName: string
    inviteeEmail: string
    inviteeUserId?: string | null
    inviteeFounderId?: string | null
    role: string
    message?: string | null
    status: FounderInviteStatus
    createdAt: string
    respondedAt?: string | null
}
