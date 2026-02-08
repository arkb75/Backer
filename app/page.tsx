import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"

export default async function Home() {
    const session = await getServerSession(authOptions)

    if (session) {
        // If logged in, redirect to onboarding (or feed if already onboarded logic added later)
        redirect("/onboarding")
    }

    // If not logged in, show Login page at root
    return (
        <AuthLayout title="Welcome" subtitle="Sign in to continue">
            <LoginForm />
        </AuthLayout>
    )
}
