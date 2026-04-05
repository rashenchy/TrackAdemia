export const registrationConfig = {
  emailVerification: 'on',
} as const

export function isRegistrationEmailVerificationEnabled() {
  return registrationConfig.emailVerification === 'on'
}
