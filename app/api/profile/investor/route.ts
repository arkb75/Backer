import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getInvestorByUserId, updateInvestorProfile } from "@/lib/db/repository"
import type { InvestmentStage } from "@/lib/db/types"

const toString = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

const toNullableString = (value: unknown): string | null => {
    const parsed = toString(value)
    return parsed.length > 0 ? parsed : null
}

const normalizeStage = (value: unknown): InvestmentStage => {
    const normalized = toString(value).toUpperCase()
    if (normalized === "SEED" || normalized === "SERIES_A" || normalized === "SERIES_B" || normalized === "GROWTH") {
        return normalized
    }
    return "SEED"
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.userType !== "INVESTOR") {
            return NextResponse.json({ error: "Only investors can update investor profiles" }, { status: 403 })
        }

        const investor = await getInvestorByUserId(session.user.id)
        if (!investor) {
            return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
        }

        const body = await req.json()
        const name = toString(body?.name)
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const interestTags = Array.isArray(body?.interestTags)
            ? body.interestTags
                .filter((item: unknown) => typeof item === "string")
                .map((item: string) => item.trim())
                .filter(Boolean)
                .slice(0, 20)
            : []

        const portfolio = Array.isArray(body?.portfolio)
            ? body.portfolio
                .map((company: unknown) => {
                    const entry = company as {
                        name?: unknown
                        stage?: unknown
                        logoUrl?: unknown
                        isExited?: unknown
                        exitYear?: unknown
                    }
                    const exitYearValue =
                        entry?.exitYear === null || entry?.exitYear === undefined || entry?.exitYear === ""
                            ? null
                            : Number.isFinite(Number(entry.exitYear))
                                ? Math.floor(Number(entry.exitYear))
                                : null
                    return {
                        name: toString(entry?.name),
                        stage: normalizeStage(entry?.stage),
                        logoUrl: toNullableString(entry?.logoUrl),
                        isExited: Boolean(entry?.isExited),
                        exitYear: exitYearValue,
                    }
                })
                .filter((company: { name: string }) => company.name)
                .slice(0, 20)
            : []

        const updated = await updateInvestorProfile({
            investorId: investor.id,
            name,
            firmName: toNullableString(body?.firmName),
            title: toNullableString(body?.title),
            location: toNullableString(body?.location),
            bio: toNullableString(body?.bio),
            profileImage: toNullableString(body?.profileImage),
            investmentStagePreference: normalizeStage(body?.investmentStagePreference),
            linkedinUrl: toNullableString(body?.linkedinUrl),
            twitterUrl: toNullableString(body?.twitterUrl),
            websiteUrl: toNullableString(body?.websiteUrl),
            interestTags,
            portfolio,
        })

        return NextResponse.json({ investor: updated })
    } catch (error) {
        console.error("[INVESTOR_PROFILE_UPDATE_ERROR]", error)
        const message = error instanceof Error ? error.message : "Failed to update investor profile"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
