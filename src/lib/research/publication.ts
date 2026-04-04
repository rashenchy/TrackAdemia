export function getPublishedAtForStatusChange(
  previousStatus: string | null | undefined,
  nextStatus: string,
  currentPublishedAt: string | null | undefined
) {
  if (nextStatus === 'Published') {
    if (previousStatus !== 'Published' || !currentPublishedAt) {
      return new Date().toISOString()
    }

    return currentPublishedAt
  }

  return null
}
