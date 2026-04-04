export const registrationConfig = {
  emailVerification: 'off',
} as const

export function isRegistrationEmailVerificationEnabled() {
  return registrationConfig.emailVerification === 'off'
}
