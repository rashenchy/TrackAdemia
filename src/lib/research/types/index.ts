export const RESEARCH_TYPE_OPTIONS = [
  { value: 'capstone', label: 'Capstone Project' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'research', label: 'General Research' },
] as const

export function getResearchTypeLabel(typeValue: string) {
  return (
    RESEARCH_TYPE_OPTIONS.find((option) => option.value === typeValue)?.label ??
    typeValue
  )
}
