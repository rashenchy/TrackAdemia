import { type AnnotationSourceType } from '@/lib/research/annotation-versioning'
import {
  type ResearchDocumentContent,
  type ResearchSubmissionFormat,
  type TextAnnotationPosition,
} from '@/lib/research/document'

export type AnnotationRecord = {
  id: string
  research_id: string
  user_id?: string | null
  version_id?: string | null
  version_number?: number | null
  version_major?: number | null
  version_minor?: number | null
  version_lineage_key?: string | null
  source_type?: AnnotationSourceType | null
  quote: string
  comment_text: string
  position_data: unknown
  is_resolved: boolean
  created_at: string
}

export type ReplyRecord = {
  id: string
  user_id: string
  message: string
  profiles?: {
    first_name?: string
    last_name?: string
    role?: string
  }
}

export type PdfHighlightArea = {
  pageIndex: number
  top: number
  left: number
  width: number
  height: number
}

export type TextSelectionDraft = TextAnnotationPosition & {
  x: number
  y: number
}

export type VersionSnapshot = {
  id: string
  version_number: number
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
  created_by_role?: string | null
  change_type?: string | null
  change_summary?: string | null
  created_at: string
  original_file_name?: string | null
  file_url?: string | null
  content_json?: unknown
}

export type ResearchDraftRecord = {
  id?: string
  research_id: string
  owner_role: string
  owner_user_id: string
  content_json?: unknown
  updated_at?: string | null
  change_summary?: string | null
  base_version_id?: string | null
}

export type ResearchRecord = {
  id: string
  title: string
  type?: string | null
  user_id: string
  members?: string[] | null
  adviser_id?: string | null
  subject_code?: string | null
  current_stage?: string | null
  status?: string | null
  submission_format?: string | null
  content_json?: unknown
  file_url?: string | null
  original_file_name?: string | null
}

export type HighlightConstructor = new (...ranges: Range[]) => {
  add: (...ranges: Range[]) => void
  clear: () => void
}

export type HighlightRegistryLike = {
  set: (name: string, highlight: InstanceType<HighlightConstructor>) => void
  delete: (name: string) => void
}

export type AnnotateFilter = 'all' | 'unresolved' | 'resolved'
export type AnnotateViewMode = 'list' | 'thread'

export type {
  ResearchDocumentContent,
  ResearchSubmissionFormat,
  TextAnnotationPosition,
}
