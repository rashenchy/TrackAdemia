import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'password_reset_session'
const CODE_LENGTH = 6
const CODE_TTL_MINUTES = 10
const SESSION_TTL_MINUTES = 30
const MAX_VERIFY_ATTEMPTS = 5
const MAX_RESENDS = 5
const RESEND_COOLDOWN_SECONDS = 30
const VERIFICATION_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

type PasswordResetSession = {
  email: string
  codeHash: string
  expiresAt: string
  sessionExpiresAt: string
  attempts: number
  resendCount: number
  lastSentAt: string
}

export const passwordResetConfig = {
  codeLength: CODE_LENGTH,
  codeTtlMinutes: CODE_TTL_MINUTES,
  sessionTtlMinutes: SESSION_TTL_MINUTES,
  maxVerifyAttempts: MAX_VERIFY_ATTEMPTS,
  maxResends: MAX_RESENDS,
  resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
}

function getSecretKey() {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.PENDING_REGISTRATION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'PASSWORD_RESET_SECRET or PENDING_REGISTRATION_SECRET must be set and at least 32 characters long.'
    )
  }

  return createHash('sha256').update(secret).digest()
}

function encryptSession(session: PasswordResetSession) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getSecretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

function decryptSession(serialized: string) {
  const [ivPart, tagPart, encryptedPart] = serialized.split('.')

  if (!ivPart || !tagPart || !encryptedPart) {
    return null
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      getSecretKey(),
      Buffer.from(ivPart, 'base64url')
    )

    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ])

    return JSON.parse(decrypted.toString('utf8')) as PasswordResetSession
  } catch {
    return null
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

function nowIso() {
  return new Date().toISOString()
}

function generateVerificationCode() {
  let code = ''

  while (code.length < CODE_LENGTH) {
    const index = randomBytes(1)[0] % VERIFICATION_ALPHABET.length
    code += VERIFICATION_ALPHABET[index]
  }

  return code
}

async function writeSessionCookie(session: PasswordResetSession) {
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, encryptSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MINUTES * 60,
  })
}

export async function clearPasswordResetSession() {
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function readPasswordResetSession() {
  const cookieStore = await cookies()
  const rawValue = cookieStore.get(COOKIE_NAME)?.value

  if (!rawValue) {
    return null
  }

  const session = decryptSession(rawValue)

  if (!session) {
    await clearPasswordResetSession()
    return null
  }

  return session
}

export async function createPasswordResetSession(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const code = generateVerificationCode()
  const now = new Date()
  const session: PasswordResetSession = {
    email: normalizedEmail,
    codeHash: hashCode(code),
    expiresAt: addMinutes(now, CODE_TTL_MINUTES).toISOString(),
    sessionExpiresAt: addMinutes(now, SESSION_TTL_MINUTES).toISOString(),
    attempts: 0,
    resendCount: 0,
    lastSentAt: nowIso(),
  }

  await writeSessionCookie(session)

  return {
    code,
    expiresAt: session.expiresAt,
  }
}

async function updatePasswordResetSession(session: PasswordResetSession) {
  await writeSessionCookie(session)
}

async function registerFailedVerificationAttempt(session: PasswordResetSession) {
  const nextSession = {
    ...session,
    attempts: session.attempts + 1,
  }

  await updatePasswordResetSession(nextSession)

  if (nextSession.attempts >= MAX_VERIFY_ATTEMPTS) {
    return 'too-many-attempts' as const
  }

  return 'invalid-code' as const
}

export async function resendPasswordResetCode(session: PasswordResetSession) {
  const now = new Date()
  const sessionExpiry = new Date(session.sessionExpiresAt)

  if (sessionExpiry <= now) {
    await clearPasswordResetSession()
    return {
      ok: false as const,
      reason: 'session-expired' as const,
    }
  }

  const secondsSinceLastSent = Math.floor(
    (now.getTime() - new Date(session.lastSentAt).getTime()) / 1000
  )

  if (secondsSinceLastSent < RESEND_COOLDOWN_SECONDS) {
    return {
      ok: false as const,
      reason: 'cooldown' as const,
      retryAfterSeconds: RESEND_COOLDOWN_SECONDS - secondsSinceLastSent,
    }
  }

  if (session.resendCount >= MAX_RESENDS) {
    return {
      ok: false as const,
      reason: 'too-many-resends' as const,
    }
  }

  const code = generateVerificationCode()
  const nextSession: PasswordResetSession = {
    ...session,
    codeHash: hashCode(code),
    expiresAt: addMinutes(now, CODE_TTL_MINUTES).toISOString(),
    attempts: 0,
    resendCount: session.resendCount + 1,
    lastSentAt: now.toISOString(),
  }

  await updatePasswordResetSession(nextSession)

  return {
    ok: true as const,
    code,
    expiresAt: nextSession.expiresAt,
  }
}

export async function verifyPasswordResetCode(code: string) {
  const session = await readPasswordResetSession()

  if (!session) {
    return {
      ok: false as const,
      reason: 'missing-session' as const,
    }
  }

  const now = new Date()

  if (new Date(session.sessionExpiresAt) <= now) {
    await clearPasswordResetSession()
    return {
      ok: false as const,
      reason: 'session-expired' as const,
    }
  }

  if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false as const,
      reason: 'too-many-attempts' as const,
    }
  }

  if (new Date(session.expiresAt) <= now) {
    return {
      ok: false as const,
      reason: 'expired-code' as const,
    }
  }

  const normalizedCode = code.trim().toUpperCase()

  if (normalizedCode.length !== CODE_LENGTH || hashCode(normalizedCode) !== session.codeHash) {
    const reason = await registerFailedVerificationAttempt(session)

    return {
      ok: false as const,
      reason,
    }
  }

  return {
    ok: true as const,
    email: session.email,
  }
}
