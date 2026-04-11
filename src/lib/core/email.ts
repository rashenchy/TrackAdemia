import 'server-only'

import nodemailer from 'nodemailer'

type SendVerificationEmailInput = {
  email: string
  code: string
  expiresAt: string
}

type SendPasswordRecoveryEmailInput = {
  email: string
  code: string
  expiresAt: string
}

function formatExpiry(expiresAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt))
}

function createTransport() {
  const user = process.env.GMAIL_USER
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '')

  if (!user) {
    throw new Error('GMAIL_USER is not set.')
  }

  if (!appPassword) {
    throw new Error('GMAIL_APP_PASSWORD is not set.')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: appPassword,
    },
  })
}

export async function sendRegistrationVerificationEmail({
  email,
  code,
  expiresAt,
}: SendVerificationEmailInput) {
  const user = process.env.GMAIL_USER

  if (!user) {
    throw new Error('GMAIL_USER is not set.')
  }

  const transporter = createTransport()
  const expiresLabel = formatExpiry(expiresAt)

  await transporter.sendMail({
    from: `TrackAdemia <${user}>`,
    to: email,
    subject: 'Complete your TrackAdemia registration',
    text: [
      'Use this verification code to finish creating your TrackAdemia account:',
      code,
      '',
      'Enter the code on the verification page to complete registration.',
      `This code expires at ${expiresLabel}.`,
      'If you did not start this registration, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Use this verification code to finish creating your TrackAdemia account:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;margin:24px 0">${code}</p>
        <p>Enter this code on the verification page to complete registration.</p>
        <p>This code expires at <strong>${expiresLabel}</strong>.</p>
        <p>If you did not start this registration, you can ignore this email.</p>
      </div>
    `,
  })
}

export async function sendPasswordRecoveryEmail({
  email,
  code,
  expiresAt,
}: SendPasswordRecoveryEmailInput) {
  const user = process.env.GMAIL_USER

  if (!user) {
    throw new Error('GMAIL_USER is not set.')
  }

  const transporter = createTransport()
  const expiresLabel = formatExpiry(expiresAt)

  await transporter.sendMail({
    from: `TrackAdemia <${user}>`,
    to: email,
    subject: 'Your TrackAdemia password reset code',
    text: [
      'We received a request to reset your TrackAdemia password.',
      '',
      'Use this verification code to continue resetting your password:',
      code,
      '',
      `This code expires at ${expiresLabel}.`,
      'If you did not request this change, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>We received a request to reset your TrackAdemia password.</p>
        <p>Use this verification code to continue resetting your password:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;margin:24px 0">${code}</p>
        <p>Enter this code on the password reset page.</p>
        <p>This code expires at <strong>${expiresLabel}</strong>.</p>
        <p>If you did not request this change, you can ignore this email.</p>
      </div>
    `,
  })
}
