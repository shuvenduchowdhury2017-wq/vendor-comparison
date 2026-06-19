import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const projects = [
    { name: 'AADVIKA', location: 'Howrah' },
    { name: 'AANAHA', location: 'Rajdanga' },
    { name: 'AARNYA', location: 'Kasba' },
    { name: 'City Square', location: 'Bhopal' },
  ]

  for (const p of projects) {
    const exists = await prisma.project.findFirst({ where: { name: p.name } })
    if (!exists) await prisma.project.create({ data: p })
  }

  const workTypes = [
    'Civil Work', 'Structural Work', 'Electrical Work',
    'Plumbing & Sanitary', 'Flooring', 'Painting',
    'Interior', 'Facade & Glazing', 'Landscaping', 'MEP',
  ]

  for (const name of workTypes) {
    await prisma.workType.upsert({ where: { name }, update: {}, create: { name } })
  }

  console.log('Seeded projects and work types.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
