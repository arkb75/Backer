import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import {
    countUnreadConversationsForFounder,
    getFounderByUserId,
    getProductsByIds,
    listFounderProductsByFounderId,
} from "@/lib/db/repository"
import FounderBottomNav from "@/components/founder/FounderBottomNav"
import styles from "./products.module.css"

export const dynamic = "force-dynamic"

export default async function FounderProductsPage() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        redirect("/login")
    }
    if (session.user.userType !== "FOUNDER") {
        redirect("/")
    }

    const founder = await getFounderByUserId(session.user.id)
    if (!founder) {
        redirect("/onboarding")
    }

    const [relations, unreadMessagesCount] = await Promise.all([
        listFounderProductsByFounderId(founder.id),
        countUnreadConversationsForFounder(founder.id),
    ])

    const products = await getProductsByIds(relations.map((relation) => relation.productId))
    const productsById = new Map(products.map((product) => [product.id, product]))
    const items = relations
        .map((relation) => {
            const product = productsById.get(relation.productId)
            if (!product) {
                return null
            }
            return {
                relation,
                product,
            }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

    return (
        <div className={styles.page}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Your Products</h1>
                    <p className={styles.subtitle}>Manage your startups and keep their pages up to date.</p>
                    <Link className={styles.addButton} href="/start-company">
                        + Add Startup
                    </Link>
                </header>

                {items.length > 0 ? (
                    <div className={styles.grid}>
                        {items.map(({ relation, product }) => (
                            <article key={relation.id} className={styles.card}>
                                <div className={styles.logoRow}>
                                    {product.logoUrl ? (
                                        <img
                                            src={product.logoUrl}
                                            alt={`${product.name} logo`}
                                            className={styles.logo}
                                        />
                                    ) : (
                                        <div className={styles.logoFallback}>
                                            {product.name.trim().charAt(0).toUpperCase() || "P"}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.cardTitle}>{product.name}</h2>
                                    {relation.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                                </div>
                                <p className={styles.cardTagline}>{product.tagline}</p>
                                <p className={styles.meta}>{relation.role} • {formatStatus(product.status)}</p>
                                <div className={styles.actions}>
                                    <Link className={styles.secondaryButton} href={`/product/${product.id}`}>
                                        View
                                    </Link>
                                    <Link className={styles.primaryButton} href={`/product/${product.id}/edit`}>
                                        Edit
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <p>No products yet.</p>
                        <Link className={styles.primaryButton} href="/start-company">
                            Create your first startup
                        </Link>
                    </div>
                )}
            </div>

            <FounderBottomNav
                activeTab="products"
                profileHref={`/founder/${founder.id}`}
                messageBadgeCount={unreadMessagesCount}
            />
        </div>
    )
}

function formatStatus(status: string): string {
    const labelByStatus: Record<string, string> = {
        IDEA: "Idea",
        BUILDING: "Building",
        LAUNCHED: "Launched",
        RAISING: "Raising",
        FUNDED: "Funded",
    }
    return labelByStatus[status] || status
}
