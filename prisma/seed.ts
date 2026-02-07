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
            description: 'EduAI is revolutionizing education by providing personalized, AI-powered tutoring that adapts to each student\'s unique learning style, pace, and needs. Our platform uses advanced machine learning to identify knowledge gaps and create custom learning paths that help students achieve mastery faster than traditional methods.',
            problem: 'Traditional education follows a one-size-fits-all approach that leaves many students behind. Students learn at different paces but are forced to move forward with the class, creating gaps in foundational knowledge that compound over time. Meanwhile, personalized tutoring is expensive and inaccessible to most families.',
            solution: 'EduAI provides affordable, on-demand AI tutoring that adapts to each student. Our AI tutor identifies exactly where students struggle, provides targeted explanations in multiple formats, and adjusts difficulty in real-time. Students get the personalized attention they need at a fraction of the cost of human tutors.',
            videoUrl: 'https://example.com/eduai-pitch.mp4',
            logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
            websiteUrl: 'https://eduai.example.com',
            status: ProductStatus.RAISING,
            stage: 'Seed',
            askAmount: 2000000,
            amountRaised: 500000,
        },
    })

    const product2 = await prisma.product.create({
        data: {
            name: 'CodeMentor',
            tagline: 'Learn to code with AI-powered guidance',
            description: 'CodeMentor makes learning to code accessible and engaging through AI-powered interactive lessons, real-time code review, and personalized project-based learning. Whether you\'re a complete beginner or looking to level up your skills, CodeMentor provides the guidance and support you need to become a confident developer.',
            problem: 'Learning to code is intimidating and frustrating for beginners. Online courses are passive and boring, bootcamps are expensive, and self-learning often leads to bad habits and getting stuck on simple errors with no one to help.',
            solution: 'CodeMentor combines interactive coding challenges with an AI mentor that provides instant feedback, explains concepts in plain English, and helps debug code in real-time. Students learn by building real projects with an AI pair programmer that teaches best practices and keeps them motivated.',
            videoUrl: 'https://example.com/codementor-pitch.mp4',
            logoUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
            websiteUrl: 'https://codementor.example.com',
            status: ProductStatus.LAUNCHED,
            stage: 'Pre-seed',
            askAmount: 500000,
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
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
