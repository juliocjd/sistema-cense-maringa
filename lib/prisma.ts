import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaMiddlewareConfigured?: boolean
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

const TRANSIENT_ERROR_CODES = new Set(['P1001', 'P1002', 'P1003', 'P1011', 'P2024'])
const MAX_PRISMA_RETRIES = 2

function setupResilientMiddleware(client: PrismaClient) {
  if (globalForPrisma.prismaMiddlewareConfigured) {
    return
  }

  client.$use(async (params, next) => {
    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await next(params)
      } catch (error) {
        const isTransientError =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          TRANSIENT_ERROR_CODES.has(error.code)

        if (isTransientError && attempt < MAX_PRISMA_RETRIES) {
          attempt += 1
          const waitTime = 200 * attempt
          console.warn(
            `[prisma] transient error ${error.code} on ${params.model}.${params.action} – tentativa ${attempt}/${MAX_PRISMA_RETRIES}`
          )
          await client.$disconnect().catch(() => undefined)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }

        throw error
      }
    }
  })

  globalForPrisma.prismaMiddlewareConfigured = true
}

setupResilientMiddleware(prisma)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
