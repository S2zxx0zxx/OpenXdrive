import { Router, type NextFunction, type Response } from 'express'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js'
import { prisma } from '../../config/prisma.js'
import { env } from '../../config/env.js'
import { decryptText, encryptText } from '../../utils/crypto.js'

export const systemRouter = Router()

// System administration is intentionally disabled until an owner configures an
// administrator email. Any normal registered user must not be able to replace
// global OAuth credentials or run server-level operations.
systemRouter.use(requireAuth)

async function isSystemAdmin(req: AuthRequest) {
  const configuredEmail = env.SYSTEM_ADMIN_EMAIL?.trim().toLowerCase()
  if (!configuredEmail || !req.user) return false
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { email: true, status: true },
  })
  return user?.status === 'active' && user.email.trim().toLowerCase() === configuredEmail
}

async function requireSystemAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!(await isSystemAdmin(req))) {
      return res.status(403).json({ code: 'SYSTEM_ADMIN_REQUIRED', message: 'System administrator access required.' })
    }
    return next()
  } catch (error) {
    return next(error)
  }
}

systemRouter.get('/permissions', async (req: AuthRequest, res, next) => {
  try {
    return res.json({ isSystemAdmin: await isSystemAdmin(req) })
  } catch (error) {
    return next(error)
  }
})

systemRouter.get('/google-config', requireSystemAdmin, async (req, res, next) => {
  try {
    const config = await prisma.providerConfig.findFirst({
      where: { userId: null, provider: 'google_drive', status: 'active' },
      orderBy: { createdAt: 'desc' }
    })

    const defaultRedirect = `${req.protocol}://${req.get('host')}/connected-accounts/google/callback`

    if (!config) {
      return res.json({
        exists: false,
        defaultRedirectUri: defaultRedirect
      })
    }

    let clientId = ''
    try {
      clientId = decryptText(config.clientIdEncrypted)
    } catch {
      clientId = ''
    }

    return res.json({
      exists: true,
      clientId,
      redirectUri: config.redirectUri,
      hasSecret: !!config.clientSecretEncrypted,
      defaultRedirectUri: defaultRedirect
    })
  } catch (error) {
    return next(error)
  }
})

systemRouter.post('/google-config', requireSystemAdmin, async (req, res, next) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body

    if (!clientId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Client ID is required.' })
    }

    const defaultRedirect = `${req.protocol}://${req.get('host')}/connected-accounts/google/callback`
    const finalRedirectUri = redirectUri || defaultRedirect

    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]

    // Retrieve the old config to see if we need to reuse the secret if it was not provided in the request
    let finalSecret = clientSecret
    if (!finalSecret) {
      const oldConfig = await prisma.providerConfig.findFirst({
        where: { userId: null, provider: 'google_drive', status: 'disabled' },
        orderBy: { createdAt: 'desc' }
      })
      if (oldConfig) {
        try {
          finalSecret = decryptText(oldConfig.clientSecretEncrypted)
        } catch {
          // ignore
        }
      }
    }

    if (!finalSecret) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Client Secret is required for first-time setup.' })
    }

    // Only disable an active configuration after validating replacement credentials.
    await prisma.providerConfig.updateMany({
      where: { userId: null, provider: 'google_drive', status: 'active' },
      data: { status: 'disabled' }
    })

    const config = await prisma.providerConfig.create({
      data: {
        userId: null,
        provider: 'google_drive',
        clientIdEncrypted: encryptText(clientId),
        clientSecretEncrypted: encryptText(finalSecret),
        redirectUri: finalRedirectUri,
        scopes,
        status: 'active'
      }
    })

    return res.status(201).json({
      status: 'success',
      message: 'Global Google OAuth configuration updated successfully.',
      id: config.id
    })
  } catch (error) {
    return next(error)
  }
})


// Legacy in-app source updates and SQLite file backup/restore were incompatible
// with the MySQL deployment and allowed arbitrary authenticated users to run
// privileged operations. Use an authenticated deployment pipeline and
// database-native backup tools instead.
function unavailable(_req: AuthRequest, res: Response) {
  return res.status(410).json({
    code: 'FEATURE_UNAVAILABLE',
    message: 'This server-management operation is unavailable. Use your deployment platform or managed MySQL backup tools.',
  })
}
systemRouter.post('/update', unavailable)
systemRouter.get('/update-log', unavailable)
systemRouter.get('/backup', unavailable)
systemRouter.post('/restore', unavailable)
