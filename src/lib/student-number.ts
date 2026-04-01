const STUDENT_NUMBER_PATTERN = /^[A-Z]{3}\d{4}-\d{5}$/

export function formatStudentNumber(value: string) {
  const upperValue = value.toUpperCase()
  let prefix = ''
  let primaryDigits = ''
  let trailingDigits = ''

  for (const char of upperValue) {
    if (prefix.length < 3) {
      if (/[A-Z]/.test(char)) {
        prefix += char
      }
      continue
    }

    if (primaryDigits.length < 4) {
      if (/\d/.test(char)) {
        primaryDigits += char
      }
      continue
    }

    if (trailingDigits.length < 5 && /\d/.test(char)) {
      trailingDigits += char
    }
  }

  if (!trailingDigits) {
    return `${prefix}${primaryDigits}`
  }

  return `${prefix}${primaryDigits}-${trailingDigits}`
}

export function normalizeStudentNumber(value: string) {
  return formatStudentNumber(value.trim())
}

export function isValidStudentNumber(value: string) {
  return STUDENT_NUMBER_PATTERN.test(value)
}

export function getStudentNumberPattern() {
  return STUDENT_NUMBER_PATTERN.source
}
