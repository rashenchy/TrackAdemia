import { isTextAnnotationPosition } from '@/lib/research/document'
import type { ResearchVersionLike } from '@/lib/research/versioning'

export type AnnotationSourceType = 'pdf' | 'text'

export type AnnotationVersionLike = ResearchVersionLike & {
  id?: string | null
}

export type AnnotationLineageRecordLike = {
  version_major?: number | null
  version_number?: number | null
  source_type?: AnnotationSourceType | null
  position_data?: unknown
}

export function getVersionLineageNumber(version: AnnotationVersionLike | null | undefined) {
  return version?.version_major ?? version?.version_number ?? null
}

export function getVersionLineageKey(version: AnnotationVersionLike | null | undefined) {
  const lineageNumber = getVersionLineageNumber(version)
  return lineageNumber != null ? String(lineageNumber) : null
}

export function getAnnotationSourceType(
  annotation: Pick<AnnotationLineageRecordLike, 'source_type' | 'position_data'>
): AnnotationSourceType | null {
  if (annotation.source_type === 'pdf' || annotation.source_type === 'text') {
    return annotation.source_type
  }

  if (isTextAnnotationPosition(annotation.position_data)) {
    return 'text'
  }

  if (Array.isArray(annotation.position_data)) {
    return 'pdf'
  }

  return null
}

export function getAnnotationVersionLineageKey(
  annotation: Pick<AnnotationLineageRecordLike, 'version_major' | 'version_number'>
) {
  const lineageNumber = annotation.version_major ?? annotation.version_number ?? null
  return lineageNumber != null ? String(lineageNumber) : null
}
