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
            yearsExperience,
            skills, // Array of strings
            founderType,
            linkedinUrl,
            twitterUrl,
            websiteUrl,
        } = body

        // Validate required fields
        if (!name || !headline || !location || !bio || !founderType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Create Founder Profile
        // We transaction to ensure atomicity
        const founder = await prisma.$transaction(async (tx) => {
            // 1. Check if founder profile already exists for this user
            const existing = await tx.founder.findUnique({
                where: { userId: session.user.id },
            })

            if (existing) {
                throw new Error("Founder profile already exists")
            }

            // 2. Create the founder
            return await tx.founder.create({
                data: {
                    userId: session.user.id,
                    name,
                    headline,
                    location,
                    bio,
                    yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
                    founderType: founderType as FounderType,
                    linkedinUrl: linkedinUrl || null,
                    twitterUrl: twitterUrl || null,
                    websiteUrl: websiteUrl || null,
                    skills: {
                        create: skills.map((skillName: string) => ({
                            name: skillName,
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
