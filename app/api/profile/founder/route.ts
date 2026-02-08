import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFounderByUserId, updateFounderProfile } from "@/lib/db/repository"
import type { FounderType } from "@/lib/db/types"

const toString = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

const toNullableString = (value: unknown): string | null => {
    const parsed = toString(value)
    return parsed.length > 0 ? parsed : null
}

const normalizeFounderType = (value: unknown): FounderType | null => {
    const normalized = toString(value).toUpperCase()
    if (normalized === "FIRST_TIME" || normalized === "SERIAL" || normalized === "EXITED") {
        return normalized
    }
    return null
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (session.user.userType !== "FOUNDER") {
            return NextResponse.json({ error: "Only founders can update founder profiles" }, { status: 403 })
        }

        const founder = await getFounderByUserId(session.user.id)
        if (!founder) {
            return NextResponse.json({ error: "Founder profile not found" }, { status: 404 })
        }

        const body = await req.json()
        const founderType = normalizeFounderType(body?.founderType)

        const name = toString(body?.name)
        const headline = toString(body?.headline)
        const location = toString(body?.location)
        const bio = toString(body?.bio)

        if (!name || !headline || !location || !bio || !founderType) {
            return NextResponse.json({ error: "Missing required profile fields" }, { status: 400 })
        }

        const yearsExperienceRaw = body?.yearsExperience
        const yearsExperience = typeof yearsExperienceRaw === "number"
            ? Math.max(0, Math.floor(yearsExperienceRaw))
            : yearsExperienceRaw === null || yearsExperienceRaw === undefined || yearsExperienceRaw === ""
                ? null
                : Number.isFinite(Number(yearsExperienceRaw))
                    ? Math.max(0, Math.floor(Number(yearsExperienceRaw)))
                    : null

        const photos = Array.isArray(body?.photos)
            ? body.photos
                .filter((item: unknown) => typeof item === "string")
                .map((item: string) => item.trim())
                .filter(Boolean)
                .slice(0, 6)
            : []

        if (photos.length === 0) {
            return NextResponse.json({ error: "At least one photo is required" }, { status: 400 })
        }

        const prompts = Array.isArray(body?.prompts)
            ? body.prompts
                .map((prompt: unknown) => {
                    const entry = prompt as { prompt?: unknown; answer?: unknown }
                    return {
                        prompt: toString(entry?.prompt),
                        answer: toString(entry?.answer),
                    }
                })
                .filter((prompt: { prompt: string; answer: string }) => prompt.prompt && prompt.answer)
                .slice(0, 3)
            : []

        const updated = await updateFounderProfile({
            founderId: founder.id,
            name,
            headline,
            location,
            bio,
            founderType,
            videoUrl: toNullableString(body?.videoUrl),
            yearsExperience,
            linkedinUrl: toNullableString(body?.linkedinUrl),
            twitterUrl: toNullableString(body?.twitterUrl),
            websiteUrl: toNullableString(body?.websiteUrl),
            photos,
            prompts,
        })

        return NextResponse.json({ founder: updated })
    } catch (error) {
        console.error("[FOUNDER_PROFILE_UPDATE_ERROR]", error)
        const message = error instanceof Error ? error.message : "Failed to update founder profile"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
