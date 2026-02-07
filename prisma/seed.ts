import { PrismaClient, UserType, FounderType, ProductStatus, InterestType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })



async function main() {
    console.log('🌱 Seeding database...')

    // Create a test founder user
    const founderUser = await prisma.user.create({
        data: {
            email: 'jane@example.com',
            passwordHash: await bcrypt.hash('password123', 10),
            userType: UserType.FOUNDER,
        },
    })

    // Create founder profile
    const founder = await prisma.founder.create({
        data: {
            userId: founderUser.id,
            name: 'Jane Doe',
            headline: 'AI/ML Engineer turned Founder',
            location: 'San Francisco, CA',
            bio: 'Former ML lead at Google. Building the future of personalized education. Passionate about using AI to democratize learning and make quality education accessible to everyone.',
            videoUrl: 'https://example.com/jane-intro.mp4', // Placeholder
            founderType: FounderType.SERIAL,
            yearsExperience: 8,
            linkedinUrl: 'https://linkedin.com/in/janedoe',
            twitterUrl: 'https://twitter.com/janedoe',
            websiteUrl: 'https://janedoe.com',
        },
    })

    // Create products
    const product1 = await prisma.product.create({
        data: {
            name: 'EduAI',
            tagline: 'Personalized AI tutoring for every student',
            videoUrl: 'https://example.com/eduai-pitch.mp4',
            status: ProductStatus.RAISING,
            amountRaised: 500000,
        },
    })

    const product2 = await prisma.product.create({
        data: {
            name: 'CodeMentor',
            tagline: 'Learn to code with AI-powered guidance',
            videoUrl: 'https://example.com/codementor-pitch.mp4',
            status: ProductStatus.LAUNCHED,
            amountRaised: 250000,
        },
    })

    // Link founder to products
    await prisma.founderProduct.create({
        data: {
            founderId: founder.id,
            productId: product1.id,
            role: 'CEO & Co-Founder',
            isPrimary: true,
        },
    })

    await prisma.founderProduct.create({
        data: {
            founderId: founder.id,
            productId: product2.id,
            role: 'Advisor',
            isPrimary: false,
        },
    })

    // Add work experience
    await prisma.workExperience.createMany({
        data: [
            {
                founderId: founder.id,
                company: 'Google',
                role: 'Senior ML Engineer',
                years: '2019-2023',
                order: 0,
            },
            {
                founderId: founder.id,
                company: 'Meta',
                role: 'ML Lead',
                years: '2017-2019',
                order: 1,
            },
            {
                founderId: founder.id,
                company: 'Startup Inc',
                role: 'AI Researcher',
                years: '2015-2017',
                order: 2,
            },
        ],
    })

    // Add skills
    await prisma.skill.createMany({
        data: [
            { founderId: founder.id, name: 'Machine Learning' },
            { founderId: founder.id, name: 'Python' },
            { founderId: founder.id, name: 'TensorFlow' },
            { founderId: founder.id, name: 'Product Management' },
            { founderId: founder.id, name: 'EdTech' },
            { founderId: founder.id, name: 'B2C SaaS' },
            { founderId: founder.id, name: 'Team Leadership' },
        ],
    })

    // Create investor user and interests
    const investorUser = await prisma.user.create({
        data: {
            email: 'investor@vc.com',
            passwordHash: await bcrypt.hash('password123', 10),
            userType: UserType.INVESTOR,
        },
    })

    const investor = await prisma.investor.create({
        data: {
            userId: investorUser.id,
            name: 'Alex Investor',
            firmName: 'Future Fund VC',
        },
    })

    // Add investor interests
    await prisma.investorInterest.createMany({
        data: [
            {
                investorId: investor.id,
                founderId: founder.id,
                interestType: InterestType.COMMITTED,
                amountCommitted: 250000,
            },
            {
                investorId: investor.id,
                productId: product1.id,
                interestType: InterestType.LIKED,
            },
        ],
    })

    console.log('✅ Seed complete!')
    console.log(`\n📝 Test founder: ${founder.name} (ID: ${founder.id})`)
    console.log(`🔗 Visit: http://localhost:3000/founder/${founder.id}`)
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
