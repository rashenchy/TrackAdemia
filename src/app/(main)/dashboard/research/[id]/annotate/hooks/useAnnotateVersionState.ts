import { useEffect, useMemo } from 'react'
import { normalizeResearchDocumentContent } from '@/lib/research/document'
import { getVersionLabel } from '@/lib/research/versioning'
import {
  type ResearchDraftRecord,
  type ResearchRecord,
  type VersionSnapshot,
} from '../types'

export function useAnnotateVersionState({
  research,
  availableVersions,
  workspaceDrafts,
  currentUserId,
  currentUserRole,
  selectedVersionNumber,
  submissionFormat,
  activeFormat,
  setActiveFormat,
  canTeacherEditPublished,
}: {
  research: ResearchRecord | null
  availableVersions: VersionSnapshot[]
  workspaceDrafts: ResearchDraftRecord[]
  currentUserId: string | null
  currentUserRole: string | null
  selectedVersionNumber: number | null
  submissionFormat: 'pdf' | 'text' | 'both'
  activeFormat: 'pdf' | 'text'
  setActiveFormat: React.Dispatch<React.SetStateAction<'pdf' | 'text'>>
  canTeacherEditPublished: boolean
}) {
  const canReview = currentUserRole === 'mentor' || currentUserRole === 'admin'
  const isAuthor = Boolean(
    research &&
      currentUserId &&
      (research.user_id === currentUserId ||
        (Array.isArray(research.members) && research.members.includes(currentUserId)))
  )
  const canParticipate = canReview || isAuthor

  const latestVersion = availableVersions[0] ?? null
  const effectiveVersion =
    availableVersions.find((version) => version.version_number === selectedVersionNumber) ??
    latestVersion
  const effectiveVersionNumber = effectiveVersion?.version_number ?? 1
  const effectiveVersionLabel = effectiveVersion ? getVersionLabel(effectiveVersion) : '1'
  const previousVersion =
    availableVersions.find((version) => version.version_number < effectiveVersionNumber) ?? null

  const studentDraft = workspaceDrafts.find(
    (draft) => draft.owner_role === 'student' && draft.owner_user_id === currentUserId
  )
  const teacherDraft = workspaceDrafts.find(
    (draft) => draft.owner_role === 'teacher' && draft.owner_user_id === currentUserId
  )

  const selectedVersionContent = useMemo(
    () =>
      normalizeResearchDocumentContent(
        effectiveVersion?.content_json ?? research?.content_json ?? null,
        research?.type
      ),
    [effectiveVersion?.content_json, research?.content_json, research?.type]
  )

  const editableWorkspaceContent = useMemo(() => {
    if (canReview) {
      return normalizeResearchDocumentContent(
        teacherDraft?.content_json ??
          effectiveVersion?.content_json ??
          research?.content_json ??
          null,
        research?.type
      )
    }

    if (isAuthor) {
      return normalizeResearchDocumentContent(
        studentDraft?.content_json ??
          research?.content_json ??
          effectiveVersion?.content_json ??
          null,
        research?.type
      )
    }

    return selectedVersionContent
  }, [
    canReview,
    effectiveVersion?.content_json,
    isAuthor,
    research?.content_json,
    selectedVersionContent,
    studentDraft?.content_json,
    teacherDraft?.content_json,
    research?.type,
  ])

  const hasPdf = submissionFormat === 'pdf' || submissionFormat === 'both'
  const hasText = submissionFormat === 'text' || submissionFormat === 'both'
  const canReviewerEditWorkspace =
    canReview && (research?.status !== 'Published' || canTeacherEditPublished)
  const canEditTextWorkspace =
    activeFormat === 'text' &&
    hasText &&
    Boolean(latestVersion) &&
    effectiveVersionNumber === latestVersion.version_number &&
    (isAuthor || canReviewerEditWorkspace)

  useEffect(() => {
    if (activeFormat === 'pdf' && !hasPdf && hasText) {
      setActiveFormat('text')
    }

    if (activeFormat === 'text' && !hasText && hasPdf) {
      setActiveFormat('pdf')
    }
  }, [activeFormat, hasPdf, hasText, setActiveFormat])

  return {
    canReview,
    isAuthor,
    canParticipate,
    latestVersion,
    effectiveVersion,
    effectiveVersionNumber,
    effectiveVersionLabel,
    previousVersion,
    selectedVersionContent,
    editableWorkspaceContent,
    hasPdf,
    hasText,
    canReviewerEditWorkspace,
    canEditTextWorkspace,
  }
}
