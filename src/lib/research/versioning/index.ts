export type ResearchVersionLike = {
  version_number?: number | null
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
  created_by_role?: string | null
}

export function getVersionLabel(version: ResearchVersionLike) {
  if (version.version_label) {
    return version.version_label
  }

  const major = version.version_major ?? version.version_number ?? 1
  const minor = version.version_minor ?? 0

  return minor > 0
    ? `${major}.${String(minor).padStart(2, '0')}`
    : String(major)
}

export function getNextStudentVersion(existingVersions: ResearchVersionLike[]) {
  const latestMajor = existingVersions.reduce((maxValue, version) => {
    const nextMajor = version.version_major ?? version.version_number ?? 0
    return Math.max(maxValue, nextMajor)
  }, 0)

  const nextMajor = latestMajor + 1

  return {
    version_major: nextMajor,
    version_minor: 0,
    version_label: String(nextMajor),
  }
}

export function getNextTeacherVersion(existingVersions: ResearchVersionLike[]) {
  const latestMajor = existingVersions.reduce((maxValue, version) => {
    const nextMajor = version.version_major ?? version.version_number ?? 0
    return Math.max(maxValue, nextMajor)
  }, 0)

  const latestMinor = existingVersions
    .filter((version) => (version.version_major ?? version.version_number ?? 0) === latestMajor)
    .reduce((maxValue, version) => {
      return Math.max(maxValue, version.version_minor ?? 0)
    }, 0)

  const nextMinor = latestMinor + 1

  return {
    version_major: latestMajor || 1,
    version_minor: nextMinor,
    version_label: `${latestMajor || 1}.${String(nextMinor).padStart(2, '0')}`,
  }
}
