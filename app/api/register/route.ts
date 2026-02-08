import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { UserType } from "@prisma/client"

export async function POST(req: Request) {
    try {
        const { email, password, userType } = await req.json()

        if (!email || !password || !userType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            )
        }

        const passwordHash = await hash(password, 12)

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                userType: userType as UserType,
            },
        })

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                userType: user.userType,
            },
        })
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        )
    }
}
