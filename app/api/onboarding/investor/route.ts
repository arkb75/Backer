import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InvestmentStage } from "@prisma/client"

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

        // Create Investor Profile with nested writes
        const investor = await prisma.$transaction(async (tx) => {
            // 1. Check if investor profile already exists
            const existing = await tx.investor.findUnique({
                where: { userId: session.user.id },
            })

            if (existing) {
                // If profile exists, return it (idempotency)
                return existing
            }

            // 2. Create the investor
            return await tx.investor.create({
                data: {
                    userId: session.user.id,
                    name: name.trim(),
                    firmName: firmName?.trim() || null,
                    title: title?.trim() || null,
                    location: location?.trim() || null,
                    bio: bio?.trim() || null,
                    profileImage: profileImage?.trim() || null,
                    investmentStagePreference: investmentStagePreference as InvestmentStage,
                    linkedinUrl: linkedinUrl?.trim() || null,
                    twitterUrl: twitterUrl?.trim() || null,
                    websiteUrl: websiteUrl?.trim() || null,

                    // Create Interest Tags
                    interestTags: {
                        create: (interestTags || []).map((tag: string, index: number) => ({
                            name: tag,
                        })),
                    },

                    // Create Portfolio Companies
                    portfolio: {
                        create: (portfolio || []).map((company: any, index: number) => ({
                            name: company.name,
                            stage: company.stage as InvestmentStage,
                            logoUrl: company.logoUrl || null,
                            isExited: false,
                            order: index,
                        })),
                    },
                },
            })
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
