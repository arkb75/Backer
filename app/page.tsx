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
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                include: {
                    founder: true,
                    investor: true
                }
            })

            if (user) {
                // Check if user has completed their profile based on type
                if (user.userType === 'FOUNDER') {
                    if (user.founder) {
                        redirect(`/founder/${user.founder.id}`)
                    } else {
                        redirect("/onboarding")
                    }
                } else if (user.userType === 'INVESTOR') {
                    if (user.investor) {
                        redirect(`/investor/${user.investor.id}`)
                    } else {
                        redirect("/investor/onboarding")
                    }
                }
            }
        }
        // Fallback: if logged in but something went wrong, go to onboarding
        redirect("/onboarding")
    }

    // If not logged in, show Login page at root
    return (
        <AuthLayout title="Welcome" subtitle="Sign in to continue">
            <LoginForm />
        </AuthLayout>
    )
}
