import { DefaultSession } from "next-auth"
import type { UserType } from "@/lib/db/types"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            userType: UserType
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        userType: UserType
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        userType: UserType
    }
}
