export const RESEARCH_TYPE_OPTIONS = [
  { value: 'capstone', label: 'Capstone Project' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'dissertation', label: 'Dissertation' },
  { value: 'research', label: 'General Research' },
  { value: 'proposal', label: 'Research Proposal' },
  { value: 'thesis', label: 'Thesis' },
] as const

export function getResearchTypeLabel(typeValue: string) {
  return (
    RESEARCH_TYPE_OPTIONS.find((option) => option.value === typeValue)?.label ??
    typeValue
  )
}
