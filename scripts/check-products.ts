import { prisma } from '../lib/prisma'

async function checkProducts() {
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            videoUrl: true,
            tagline: true
        }
    })

    console.log('Total products:', products.length)
    console.log('\nProducts with videos:')
    const withVideos = products.filter(p => p.videoUrl)
    console.log(withVideos.length > 0 ? JSON.stringify(withVideos, null, 2) : 'None')

    console.log('\nProducts without videos:')
    const withoutVideos = products.filter(p => !p.videoUrl)
    console.log(withoutVideos.map(p => `- ${p.name}`).join('\n'))

    await prisma.$disconnect()
}

checkProducts()
