export const RESEARCH_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Resubmitted', label: 'Resubmitted' },
  { value: 'Revision Requested', label: 'Revision Requested' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Published', label: 'Published' },
  { value: 'Rejected', label: 'Rejected' },
] as const

export const MANUAL_RESEARCH_STATUS_OPTIONS = [
  { value: 'Approved', label: 'Approved (Internal)' },
  { value: 'Published', label: 'Published (Public Repository)' },
  { value: 'Rejected', label: 'Rejected' },
] as const

export function isManualResearchStatus(statusValue: string) {
  return MANUAL_RESEARCH_STATUS_OPTIONS.some((option) => option.value === statusValue)
}

export function getResearchStatusLabel(statusValue: string) {
  return (
    RESEARCH_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ??
    statusValue
  )
}
