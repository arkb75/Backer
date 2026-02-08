import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Get the founder record
        const founder = await prisma.founder.findUnique({
            where: { userId: session.user.id }
        })

        if (!founder) {
            return new NextResponse('Founder profile not found', { status: 404 })
        }

        const body = await req.json()
        const {
            name,
            tagline,
            description,
            problem,
            solution,
            websiteUrl,
            stage,
            askAmount,
            videoUrl,
            logoUrl
        } = body

        // Validation
        if (!name || !tagline) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        // Create the product (company) and link to founder
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Product
            const product = await tx.product.create({
                data: {
                    name,
                    tagline,
                    description,
                    problem,
                    solution,
                    websiteUrl,
                    stage,
                    askAmount: askAmount ? parseInt(askAmount) : undefined,
                    videoUrl,
                    logoUrl,
                    status: 'BUILDING', // Default status
                }
            })

            // 2. Link to Founder
            // Check if this is their first product to set isPrimary
            const productCount = await tx.founderProduct.count({
                where: { founderId: founder.id }
            })

            const founderProduct = await tx.founderProduct.create({
                data: {
                    founderId: founder.id,
                    productId: product.id,
                    role: 'Founder', // Default role
                    isPrimary: productCount === 0 // Make primary if first
                }
            })

            return { product, founderProduct }
        })

        return NextResponse.json(result)

    } catch (error) {
        console.error('[COMPANY_CREATE_ERROR]', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
