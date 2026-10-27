// Client-side checks that mirror what the backend will reject anyway, so
// people see the problem beside the field before a round trip. The server
// stays the source of truth: these never replace its validation.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value) {
  const email = value.trim()
  if (!email) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address, like name@example.com.'
  return null
}

export const MIN_PASSWORD_LENGTH = 8

export function validateNewPassword(value) {
  if (!value) return 'Enter a password.'
  if (value.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  return null
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return 'Re-enter the password.'
  if (password !== confirmation) return 'Passwords don’t match.'
  return null
}
