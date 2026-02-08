import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"

interface LoginPageProps {
    searchParams?: {
        inviteEmail?: string | string[]
    }
}

const parseFirstValue = (value?: string | string[]): string | undefined => {
    if (Array.isArray(value)) return value[0]
    return value
}

export default function LoginPage({ searchParams }: LoginPageProps) {
    const lockedEmail = parseFirstValue(searchParams?.inviteEmail)

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to your account">
            <LoginForm lockedEmail={lockedEmail} />
        </AuthLayout>
    )
}
