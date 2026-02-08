import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { createUser } from "@/lib/db/repository"
import type { UserType } from "@/lib/db/types"

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
        const normalizedUserType = String(userType).toUpperCase()
        if (normalizedUserType !== "FOUNDER" && normalizedUserType !== "INVESTOR") {
            return NextResponse.json(
                { error: "Invalid user type" },
                { status: 400 }
            )
        }

        const passwordHash = await hash(password, 12)

        const user = await createUser({
            email,
            passwordHash,
            userType: normalizedUserType as UserType,
        })

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                userType: user.userType,
            },
        })
    } catch (error: unknown) {
        console.error("Registration error:", error)
        const message = error instanceof Error ? error.message : "Something went wrong"
        if (message === "User already exists") {
            return NextResponse.json({ error: message }, { status: 400 })
        }
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
