import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FounderType } from "@prisma/client"

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

        // Create Founder Profile with nested writes for photos and prompts
        const founder = await prisma.$transaction(async (tx) => {
            // 1. Check if founder profile already exists
            const existing = await tx.founder.findUnique({
                where: { userId: session.user.id },
            })

            if (existing) {
                // If profile exists, return it (idempotency for double-clicks/refreshes)
                return existing
            }

            // 2. Create the founder
            return await tx.founder.create({
                data: {
                    userId: session.user.id,
                    name,
                    headline,
                    location,
                    bio,
                    founderType: founderType as FounderType,
                    videoUrl: videoUrl || null,

                    // Create Photos
                    photos: {
                        create: photos.map((url: string, index: number) => ({
                            url,
                            order: index,
                        })),
                    },

                    // Create Prompts
                    prompts: {
                        create: prompts.map((p: any, index: number) => ({
                            prompt: p.prompt,
                            answer: p.answer,
                            order: index,
                        })),
                    },
                },
            })
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
