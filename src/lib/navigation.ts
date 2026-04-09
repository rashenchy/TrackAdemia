export function isSafeInternalPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

export function appendFromParam(href: string, from: string | null | undefined) {
  if (!isSafeInternalPath(href) || !isSafeInternalPath(from)) {
    return href
  }

  const safeFrom = from as string

  const [pathPart, hashPart] = href.split('#', 2)
  const [pathname, queryString = ''] = pathPart.split('?', 2)
  const params = new URLSearchParams(queryString)
  params.set('from', safeFrom)

  const nextQuery = params.toString()
  const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname

  return hashPart ? `${nextHref}#${hashPart}` : nextHref
}

export function buildPathWithSearch(
  pathname: string,
  entries: Array<[string, string | null | undefined]>
) {
  const params = new URLSearchParams()

  for (const [key, value] of entries) {
    if (value) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
