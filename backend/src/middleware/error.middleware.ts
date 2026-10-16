import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

/**
 * Convert expected validation/database errors into stable 4xx responses.
 * Never return raw Prisma stack traces, SQL, provider credentials or request
 * bodies in an unhandled 5xx response.
 */
export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request parameters.',
      issues: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
    })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return res.status(404).json({ code: 'NOT_FOUND', message: 'Resource not found.' })
    if (error.code === 'P2002') return res.status(409).json({ code: 'CONFLICT', message: 'Resource already exists.' })
    if (error.code === 'P2003') return res.status(409).json({ code: 'INVALID_RELATION', message: 'Related resource could not be found.' })
  }
  return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' })
}
