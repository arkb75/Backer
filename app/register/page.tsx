import AuthLayout from "@/components/auth/AuthLayout"
import RegisterForm from "@/components/auth/RegisterForm"

interface RegisterPageProps {
    searchParams?: {
        inviteEmail?: string | string[]
    }
}

const parseFirstValue = (value?: string | string[]): string | undefined => {
    if (Array.isArray(value)) return value[0]
    return value
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
    const lockedEmail = parseFirstValue(searchParams?.inviteEmail)

    return (
        <AuthLayout title="Create your account" subtitle="Join the community of founders and investors">
            <RegisterForm lockedEmail={lockedEmail} />
        </AuthLayout>
    )
}
