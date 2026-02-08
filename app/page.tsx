import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"
import { prisma } from "@/lib/prisma"

export default async function Home() {
    const session = await getServerSession(authOptions)

    if (session) {
        if (session.user?.id) {
            const founder = await prisma.founder.findUnique({
                where: { userId: session.user.id }
            })
            if (founder) {
                redirect(`/founder/${founder.id}`)
            }
        }
        // If logged in but no profile, go to onboarding
        redirect("/onboarding")
    }

    // If not logged in, show Login page at root
    return (
        <AuthLayout title="Welcome" subtitle="Sign in to continue">
            <LoginForm />
        </AuthLayout>
    )
}
