import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const trimString = (value: unknown): string => {
    return typeof value === 'string' ? value.trim() : ''
}

const nullableString = (value: unknown): string | null => {
    const parsed = trimString(value)
    return parsed ? parsed : null
}

const truncate = (value: string, maxLength: number): string => {
    return value.slice(0, maxLength)
}

const parseAskAmount = (value: unknown): { value?: number; error?: string } => {
    if (value === undefined || value === null || value === '') {
        return {}
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) {
            return { error: 'Ask amount must be a non-negative number' }
        }
        return { value: Math.floor(value) }
    }

    if (typeof value === 'string') {
        const normalized = value.replace(/[$,\s]/g, '')
        if (!normalized) {
            return {}
        }

        const parsed = Number.parseInt(normalized, 10)
        if (Number.isNaN(parsed) || parsed < 0) {
            return { error: 'Ask amount must be a non-negative number' }
        }
        return { value: parsed }
    }

    return { error: 'Ask amount must be a non-negative number' }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get the founder record
        const founder = await prisma.founder.findUnique({
            where: { userId: session.user.id }
        })

        if (!founder) {
            return NextResponse.json(
                { error: 'Please complete founder onboarding before creating a company' },
                { status: 400 }
            )
        }

        const body = await req.json()
        const name = trimString(body?.name)
        const tagline = trimString(body?.tagline) || 'Startup in progress'
        const description = trimString(body?.description)
        const problem = trimString(body?.problem)
        const solution = trimString(body?.solution)
        const websiteUrl = nullableString(body?.websiteUrl)
        const stage = trimString(body?.stage)
        const askAmount = body?.askAmount
        const videoUrl = nullableString(body?.videoUrl)
        const logoUrl = nullableString(body?.logoUrl)

        // Validation
        if (!name) {
            return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
        }

        const { value: parsedAskAmount, error: askAmountError } = parseAskAmount(askAmount)
        if (askAmountError) {
            return NextResponse.json({ error: askAmountError }, { status: 400 })
        }

        // Create the product (company) and link to founder
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Product
            const product = await tx.product.create({
                data: {
                    name: truncate(name, 100),
                    tagline: truncate(tagline, 200),
                    description: description ? truncate(description, 1000) : null,
                    problem: problem ? truncate(problem, 500) : null,
                    solution: solution ? truncate(solution, 500) : null,
                    websiteUrl,
                    stage: stage ? truncate(stage, 50) : null,
                    askAmount: parsedAskAmount ?? null,
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

    } catch (error: unknown) {
        console.error('[COMPANY_CREATE_ERROR]', error)
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unexpected error occurred while creating the company'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
