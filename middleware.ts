import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // Custom logic if needed, e.g. redirecting based on role
        // For now, just ensure authentication for matched routes

        // Example: redirect accessing /onboarding if they already have a profile? 
        // We can handle that in the page component or here.
        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token, // Return true if authenticated
        },
    }
)

export const config = {
    matcher: [
        "/onboarding/:path*",
        "/investor/onboarding/:path*",
        "/feed/:path*",
        // Add other protected routes here
    ],
}
