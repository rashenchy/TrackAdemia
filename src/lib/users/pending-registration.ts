import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'pending_registration'
const CODE_LENGTH = 6
const CODE_TTL_MINUTES = 10
const SESSION_TTL_MINUTES = 60
const MAX_VERIFY_ATTEMPTS = 5
const MAX_RESENDS = 5
const RESEND_COOLDOWN_SECONDS = 30
const VERIFICATION_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export type PendingRegistrationRole = 'student' | 'mentor'

export type PendingRegistrationPayload = {
  email: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  course: string
  role: PendingRegistrationRole
  studentNumber: string | null
}

type PendingRegistrationSession = {
  payload: PendingRegistrationPayload
  codeHash: string
  expiresAt: string
  sessionExpiresAt: string
  attempts: number
  resendCount: number
  lastSentAt: string
}

export type VerificationFailureReason =
  | 'missing-session'
  | 'invalid-code'
  | 'expired-code'
  | 'too-many-attempts'
  | 'session-expired'

export const verificationConfig = {
  codeLength: CODE_LENGTH,
  codeTtlMinutes: CODE_TTL_MINUTES,
  sessionTtlMinutes: SESSION_TTL_MINUTES,
  maxVerifyAttempts: MAX_VERIFY_ATTEMPTS,
  maxResends: MAX_RESENDS,
  resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
}

function getSecretKey() {
  const secret = process.env.PENDING_REGISTRATION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'PENDING_REGISTRATION_SECRET must be set and at least 32 characters long.'
    )
  }

  return createHash('sha256').update(secret).digest()
}

function encryptSession(session: PendingRegistrationSession) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getSecretKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

function serializeSession(session: PendingRegistrationSession) {
  return encryptSession(session)
}

function decryptSession(serialized: string): PendingRegistrationSession | null {
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

    return JSON.parse(decrypted.toString('utf8')) as PendingRegistrationSession
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

async function writeSessionCookie(session: PendingRegistrationSession) {
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, encryptSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MINUTES * 60,
  })
}

export async function clearPendingRegistration() {
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function readPendingRegistration() {
  const cookieStore = await cookies()
  const rawValue = cookieStore.get(COOKIE_NAME)?.value

  if (!rawValue) {
    return null
  }

  const session = decryptSession(rawValue)

  if (!session) {
    await clearPendingRegistration()
    return null
  }

  return session
}

export async function readPendingRegistrationFromToken(flowToken?: string | null) {
  if (!flowToken) {
    return readPendingRegistration()
  }

  const cookieSession = await readPendingRegistration()

  if (cookieSession) {
    return cookieSession
  }

  return decryptSession(flowToken)
}

export function generateVerificationCode() {
  let code = ''

  while (code.length < CODE_LENGTH) {
    const index = randomBytes(1)[0] % VERIFICATION_ALPHABET.length
    code += VERIFICATION_ALPHABET[index]
  }

  return code
}

export function maskEmailAddress(email: string) {
  const [localPart, domain = ''] = email.split('@')

  if (!localPart) {
    return email
  }

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? ''}*`
      : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 1))}`

  return domain ? `${visibleLocal}@${domain}` : visibleLocal
}

export async function createPendingRegistrationSession(
  payload: PendingRegistrationPayload
) {
  const code = generateVerificationCode()
  const now = new Date()
  const session: PendingRegistrationSession = {
    payload,
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
    flowToken: serializeSession(session),
    maskedEmail: maskEmailAddress(payload.email),
  }
}

export async function updatePendingRegistrationSession(
  session: PendingRegistrationSession
) {
  await writeSessionCookie(session)
}

export async function registerFailedVerificationAttempt(
  session: PendingRegistrationSession
) {
  const nextAttempts = session.attempts + 1
  const nextSession = {
    ...session,
    attempts: nextAttempts,
  }

  await updatePendingRegistrationSession(nextSession)

  if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      session: nextSession,
      reason: 'too-many-attempts' as const,
    }
  }

  return {
    session: nextSession,
    reason: 'invalid-code' as const,
  }
}

export async function resendPendingRegistrationCode(
  session: PendingRegistrationSession
) {
  const now = new Date()
  const sessionExpiry = new Date(session.sessionExpiresAt)

  if (sessionExpiry <= now) {
    await clearPendingRegistration()
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
  const nextSession: PendingRegistrationSession = {
    ...session,
    codeHash: hashCode(code),
    expiresAt: addMinutes(now, CODE_TTL_MINUTES).toISOString(),
    attempts: 0,
    resendCount: session.resendCount + 1,
    lastSentAt: now.toISOString(),
  }

  await updatePendingRegistrationSession(nextSession)

  return {
    ok: true as const,
    code,
    expiresAt: nextSession.expiresAt,
    flowToken: serializeSession(nextSession),
  }
}

export async function verifyPendingRegistrationCode(
  code: string,
  flowToken?: string | null
) {
  const session = await readPendingRegistrationFromToken(flowToken)

  if (!session) {
    return {
      ok: false as const,
      reason: 'missing-session' as const,
    }
  }

  const now = new Date()

  if (new Date(session.sessionExpiresAt) <= now) {
    await clearPendingRegistration()
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
    const failure = await registerFailedVerificationAttempt(session)

    return {
      ok: false as const,
      reason: failure.reason,
    }
  }

  return {
    ok: true as const,
    payload: session.payload,
  }
}
