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
            name: 'Alex Rivera',
            firmName: 'Future Fund VC',
            title: 'Managing Partner',
            bio: 'I invest in bold founders building the future of work, education, and healthcare. 15+ years backing seed-stage startups. Former founder (exited to Google). I believe in betting on people, not just ideas.',
            profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
            location: 'San Francisco, CA',
            investmentStagePreference: 'SEED',
            linkedinUrl: 'https://linkedin.com/in/alexrivera',
            twitterUrl: 'https://twitter.com/alexrivera',
            websiteUrl: 'https://futurefundvc.com',
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

    // Add portfolio companies
    await prisma.portfolioCompany.createMany({
        data: [
            {
                investorId: investor.id,
                name: 'Zoom (Seed)',
                logoUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200',
                stage: 'SEED',
                isExited: true,
                exitYear: 2019,
                order: 0,
            },
            {
                investorId: investor.id,
                name: 'Notion',
                logoUrl: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=200',
                stage: 'SERIES_A',
                isExited: false,
                order: 1,
            },
            {
                investorId: investor.id,
                name: 'Figma',
                logoUrl: 'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?w=200',
                stage: 'SEED',
                isExited: true,
                exitYear: 2022,
                order: 2,
            },
            {
                investorId: investor.id,
                name: 'Linear',
                logoUrl: 'https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=200',
                stage: 'SERIES_A',
                isExited: false,
                order: 3,
            },
            {
                investorId: investor.id,
                name: 'Airtable',
                logoUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200',
                stage: 'SEED',
                isExited: false,
                order: 4,
            },
            {
                investorId: investor.id,
                name: 'Superhuman',
                logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200',
                stage: 'SEED',
                isExited: false,
                order: 5,
            },
        ],
    })

    // Add industry interest tags
    await prisma.investorInterestTag.createMany({
        data: [
            { investorId: investor.id, name: 'SaaS' },
            { investorId: investor.id, name: 'EdTech' },
            { investorId: investor.id, name: 'HealthTech' },
            { investorId: investor.id, name: 'Future of Work' },
            { investorId: investor.id, name: 'AI/ML' },
            { investorId: investor.id, name: 'Developer Tools' },
            { investorId: investor.id, name: 'B2B' },
            { investorId: investor.id, name: 'Productivity' },
        ],
    })

    // Add photos (Hinge-style)
    await prisma.founderPhoto.createMany({
        data: [
            {
                founderId: founder.id,
                url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
                order: 0,
                caption: 'Speaking at TechCrunch Disrupt',
            },
            {
                founderId: founder.id,
                url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
                order: 1,
                caption: 'Team building day',
            },
            {
                founderId: founder.id,
                url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
                order: 2,
                caption: null,
            },
            {
                founderId: founder.id,
                url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
                order: 3,
                caption: 'Brainstorming the next feature',
            },
        ],
    })

    // Add prompts (Hinge-style Q&A)
    await prisma.founderPrompt.createMany({
        data: [
            {
                founderId: founder.id,
                prompt: 'The biggest risk I ever took was...',
                answer: 'Leaving my $400K/year job at Google to start EduAI with just an idea and $20K in savings. Best decision of my life.',
                order: 0,
            },
            {
                founderId: founder.id,
                prompt: 'What keeps me up at night is...',
                answer: 'Making sure we reach students who need us most before they fall behind. Every day matters.',
                order: 1,
            },
            {
                founderId: founder.id,
                prompt: 'My unfair advantage is...',
                answer: 'I taught myself to code at 13 in a rural village with dialup internet. I know firsthand how transformative access to education can be.',
                order: 2,
            },
        ],
    })

    console.log('✅ Seed complete!')
    console.log(`\n📝 Test founder: ${founder.name} (ID: ${founder.id})`)
    console.log(`🔗 Visit: http://localhost:3000/founder/${founder.id}`)
    console.log(`\n💼 Test investor: ${investor.name} (ID: ${investor.id})`)
    console.log(`🔗 Visit: http://localhost:3000/investor/${investor.id}`)
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
