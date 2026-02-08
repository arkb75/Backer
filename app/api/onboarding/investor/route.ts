import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createInvestorOnboarding } from "@/lib/db/repository"
import type { InvestmentStage } from "@/lib/db/types"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const {
            name,
            firmName,
            title,
            location,
            bio,
            profileImage,
            investmentStagePreference,
            interestTags, // Array of strings
            portfolio, // Array of { name, stage, logoUrl? }
            linkedinUrl,
            twitterUrl,
            websiteUrl,
        } = body

        // Validate required fields
        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            )
        }

        const normalizedStage = String(investmentStagePreference || "SEED").toUpperCase()
        if (!["SEED", "SERIES_A", "SERIES_B", "GROWTH"].includes(normalizedStage)) {
            return NextResponse.json(
                { error: "Invalid investment stage preference" },
                { status: 400 }
            )
        }

        const investor = await createInvestorOnboarding({
            userId: session.user.id,
            name,
            firmName,
            title,
            location,
            bio,
            profileImage,
            investmentStagePreference: normalizedStage as InvestmentStage,
            linkedinUrl,
            twitterUrl,
            websiteUrl,
            interestTags: Array.isArray(interestTags) ? interestTags : [],
            portfolio: Array.isArray(portfolio)
                ? portfolio.map((company: any) => ({
                    name: String(company?.name || "").trim(),
                    stage: String(company?.stage || "SEED").toUpperCase() as InvestmentStage,
                    logoUrl: typeof company?.logoUrl === "string" ? company.logoUrl : null,
                    isExited: Boolean(company?.isExited),
                    exitYear: company?.exitYear ? Number(company.exitYear) : null,
                }))
                : [],
        })

        return NextResponse.json({ id: investor.id })
    } catch (error: any) {
        console.error("Investor onboarding error:", error)
        return NextResponse.json(
            { error: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
