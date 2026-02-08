import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createFounderOnboarding } from "@/lib/db/repository"
import type { FounderType } from "@/lib/db/types"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const {
            name,
            headline,
            location,
            bio,
            founderType,
            photos, // Array of strings (URLs)
            prompts, // Array of { prompt, answer }
            videoUrl, // Optional string
        } = body

        // Validate required fields
        if (!name || !headline || !location || !bio || !founderType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Validate photos
        if (!photos || !Array.isArray(photos) || photos.length === 0) {
            return NextResponse.json(
                { error: "At least one photo is required" },
                { status: 400 }
            )
        }

        const normalizedFounderType = String(founderType).toUpperCase()
        if (!["FIRST_TIME", "SERIAL", "EXITED"].includes(normalizedFounderType)) {
            return NextResponse.json(
                { error: "Invalid founder type" },
                { status: 400 }
            )
        }

        const founder = await createFounderOnboarding({
            userId: session.user.id,
            name: String(name).trim(),
            headline: String(headline).trim(),
            location: String(location).trim(),
            bio: String(bio).trim(),
            founderType: normalizedFounderType as FounderType,
            videoUrl: typeof videoUrl === "string" ? videoUrl.trim() || null : null,
            photos: photos as string[],
            prompts: Array.isArray(prompts) ? prompts : [],
        })

        return NextResponse.json({ id: founder.id })
    } catch (error: any) {
        console.error("Onboarding error:", error)
        return NextResponse.json(
            { error: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
