const emailVerificationMode =
  process.env.REGISTRATION_EMAIL_VERIFICATION?.trim().toLowerCase() === 'off'
    ? 'off'
    : 'on'

export const registrationConfig = {
  emailVerification: emailVerificationMode,
} as const

export function isRegistrationEmailVerificationEnabled() {
  return registrationConfig.emailVerification === 'on'
}
