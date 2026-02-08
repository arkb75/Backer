import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getInvestorByUserId } from "@/lib/db/repository"
import InvestorBottomNav from "@/components/investor/InvestorBottomNav"

export default async function MessagesPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "INVESTOR") {
        redirect("/")
    }

    const viewerInvestor = await getInvestorByUserId(session.user.id)
    const profileHref = viewerInvestor ? `/investor/${viewerInvestor.id}` : "/investor/onboarding"

    return (
        <div style={{ minHeight: "100vh", paddingBottom: "96px", background: "black" }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                color: "white",
                textAlign: "center",
                padding: "2rem",
                background: "black"
            }}>
                <h2 style={{ marginBottom: "1rem" }}>Messages</h2>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>
                    Coming soon! Connect with founders here.
                </p>
            </div>
            <InvestorBottomNav activeTab="messages" profileHref={profileHref} />
        </div>
    )
}
