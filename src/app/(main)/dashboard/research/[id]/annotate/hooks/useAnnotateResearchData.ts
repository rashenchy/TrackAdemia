import { useCallback, useEffect, useState } from 'react'
import { type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { createClient } from '@/lib/supabase/client'
import {
  getAnnotations,
  getResearchFile,
  getResearchFileForVersion,
} from '../actions'
import {
  hasResearchTextContent,
  normalizeResearchDocumentContent,
  resolveResearchSubmissionFormat,
} from '@/lib/research/document'
import { canTeacherEditPublishedResearch } from '@/lib/research/permissions'
import {
  type AnnotationRecord,
  type ResearchDraftRecord,
  type ResearchRecord,
  type ResearchSubmissionFormat,
  type VersionSnapshot,
} from '../types'
import { isFacultyRole } from '@/lib/users/access'

type ClientLike = ReturnType<typeof createClient>

export function useAnnotateResearchData({
  supabase,
  router,
  researchId,
  selectedVersionNumber,
}: {
  supabase: ClientLike
  router: AppRouterInstance
  researchId: string
  selectedVersionNumber: number | null
}) {
  const [research, setResearch] = useState<ResearchRecord | null>(null)
  const [availableVersions, setAvailableVersions] = useState<VersionSnapshot[]>([])
  const [workspaceDrafts, setWorkspaceDrafts] = useState<ResearchDraftRecord[]>([])
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([])
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [researchStatus, setResearchStatus] = useState('Pending Review')
  const [submissionFormat, setSubmissionFormat] = useState<ResearchSubmissionFormat>('pdf')
  const [activeFormat, setActiveFormat] = useState<'pdf' | 'text'>('pdf')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [canTeacherEditPublished, setCanTeacherEditPublished] = useState(false)

  const loadWorkspaceData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      const [{ data: profile }, { data: researchData, error: researchError }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase
          .from('research')
          .select(
            'id, title, type, user_id, members, adviser_id, subject_code, current_stage, status, submission_format, content_json, file_url, original_file_name'
          )
          .eq('id', researchId)
          .single(),
      ])

      if (researchError || !researchData) {
        throw new Error('Research record not found.')
      }

      setCurrentUserRole(profile?.role ?? null)
      setResearch(researchData)
      setResearchStatus(researchData.status ?? 'Pending Review')
      setCanTeacherEditPublished(
        isFacultyRole(profile?.role) && researchData.status === 'Published'
          ? await canTeacherEditPublishedResearch(supabase, user.id, researchData)
          : false
      )

      const { data: versionsData } = await supabase
        .from('research_versions')
        .select(
          'id, version_number, version_major, version_minor, version_label, created_by_role, change_type, change_summary, created_at, original_file_name, file_url, content_json'
        )
        .eq('research_id', researchId)
        .order('version_number', { ascending: false })

      const versionRows: VersionSnapshot[] =
        versionsData && versionsData.length > 0
          ? versionsData
          : [
              {
                id: 'legacy',
                version_number: 1,
                version_major: 1,
                version_minor: 0,
                version_label: '1',
                created_by_role: 'student',
                created_at: new Date().toISOString(),
                original_file_name: researchData.original_file_name,
                file_url: researchData.file_url,
                content_json: researchData.content_json,
              },
            ]

      setAvailableVersions(versionRows)

      const { data: draftsData, error: draftsError } = await supabase
        .from('research_drafts')
        .select(
          'id, research_id, owner_role, owner_user_id, content_json, updated_at, change_summary, base_version_id'
        )
        .eq('research_id', researchId)

      if (!draftsError && draftsData) {
        setWorkspaceDrafts(draftsData)
      } else {
        setWorkspaceDrafts([])
      }

      const selectedVersion =
        versionRows.find((version) => version.version_number === selectedVersionNumber) ??
        versionRows[0]
      const selectedVersionFileUrl =
        selectedVersion?.version_number != null
          ? await getResearchFileForVersion(researchId, selectedVersion.version_number)
          : await getResearchFile(researchId)
      setFileUrl(selectedVersionFileUrl ?? null)

      const selectedContent = normalizeResearchDocumentContent(
        selectedVersion?.content_json ?? researchData.content_json,
        researchData.type
      )
      const derivedSubmissionFormat = resolveResearchSubmissionFormat(
        researchData.submission_format,
        {
          hasPdf: Boolean(selectedVersion?.file_url ?? researchData.file_url),
          hasText: hasResearchTextContent(selectedContent, researchData.current_stage),
          stage: researchData.current_stage,
        }
      )
      setSubmissionFormat(derivedSubmissionFormat)
      setActiveFormat((current) => {
        if (derivedSubmissionFormat === 'text') return 'text'
        if (derivedSubmissionFormat === 'pdf') return 'pdf'
        return current
      })

      const annotationRows = await getAnnotations(researchId, selectedVersion ?? null)
      setAnnotations(annotationRows as AnnotationRecord[])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load the unified review workspace.'
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [researchId, router, selectedVersionNumber, supabase])

  useEffect(() => {
    void loadWorkspaceData()
  }, [loadWorkspaceData])

  useEffect(() => {
    const channel = supabase
      .channel(`research-status:${researchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research',
          filter: `id=eq.${researchId}`,
        },
        (payload: {
          new?: Partial<ResearchRecord> & { status?: string | null; current_stage?: string | null }
        }) => {
          const nextRecord = payload.new

          if (!nextRecord) return

          setResearch((current) => (current ? { ...current, ...nextRecord } : current))

          if (typeof nextRecord.status === 'string' && nextRecord.status.length > 0) {
            setResearchStatus(nextRecord.status)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [researchId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`research-annotations:${researchId}:${selectedVersionNumber ?? 'latest'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `research_id=eq.${researchId}`,
        },
        async () => {
          const activeVersion =
            availableVersions.find((version) => version.version_number === selectedVersionNumber) ??
            availableVersions[0] ??
            null
          const nextAnnotations = await getAnnotations(researchId, activeVersion)
          setAnnotations(nextAnnotations as AnnotationRecord[])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [availableVersions, researchId, selectedVersionNumber, supabase])

  return {
    research,
    setResearch,
    availableVersions,
    workspaceDrafts,
    annotations,
    setAnnotations,
    fileUrl,
    researchStatus,
    setResearchStatus,
    submissionFormat,
    activeFormat,
    setActiveFormat,
    isLoading,
    loadError,
    currentUserId,
    currentUserRole,
    canTeacherEditPublished,
    loadWorkspaceData,
  }
}
