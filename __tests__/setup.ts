import { vi } from 'vitest'

// Mock next/headers globally
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock next/navigation globally
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

// Mock lib/db globally
vi.mock('@/lib/db', () => ({
  prisma: {
    tender: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vendor: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    vendorInvite: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    quotation: {
      create: vi.fn(),
      update: vi.fn(),
    },
    quotationItem: {
      deleteMany: vi.fn(),
    },
    quotationDraft: {
      upsert: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    workType: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    boqReference: {
      findMany: vi.fn(),
    },
    tenderAttachment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
