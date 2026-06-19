import 'dotenv/config'
import path from 'path'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
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
