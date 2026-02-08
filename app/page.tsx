import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"
import {
    getFounderByUserId,
    getInvestorByUserId,
    getUserById,
} from "@/lib/db/repository"

export default async function Home() {
    const session = await getServerSession(authOptions)

    if (session) {
        if (session.user?.id) {
            const user = await getUserById(session.user.id)

            if (user) {
                // Check if user has completed their profile based on type
                if (user.userType === 'FOUNDER') {
                    const founder = await getFounderByUserId(user.id)
                    if (founder) {
                        redirect(`/founder/${founder.id}`)
                    } else {
                        redirect("/onboarding")
                    }
                } else if (user.userType === 'INVESTOR') {
                    const investor = await getInvestorByUserId(user.id)
                    if (investor) {
                        redirect("/investor/feed")
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
