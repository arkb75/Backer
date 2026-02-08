import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
    getFounderByUserId,
    getProductById,
    listFounderProductsByFounderId,
} from "@/lib/db/repository"
import ProductEditForm from "@/components/product/ProductEditForm"

interface PageProps {
    params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export default async function ProductEditPage({ params }: PageProps) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "FOUNDER") {
        redirect("/")
    }

    const { id } = await params
    const product = await getProductById(id)
    if (!product) {
        notFound()
    }

    const founder = await getFounderByUserId(session.user.id)
    if (!founder) {
        redirect("/onboarding")
    }

    const memberships = await listFounderProductsByFounderId(founder.id)
    const isOwner = memberships.some((membership) => membership.productId === product.id)
    if (!isOwner) {
        redirect(`/product/${product.id}`)
    }

    return (
        <main style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: "24px" }}>
            <ProductEditForm product={product} />
        </main>
    )
}
