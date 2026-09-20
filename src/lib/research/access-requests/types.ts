export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'

export type ResearchAccessRequest = {
  id: string
  research_id: string
  user_id: string | null
  guest_name: string | null
  guest_email: string | null
  message: string
  status: AccessRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  reviewer_notes?: string | null
  access_token: string | null
  created_at: string
  updated_at?: string
  user_profile?: {
    first_name: string
    last_name: string
    role?: string
    course_program?: string
  }
}

export type ResearchAccessRequestWithDetails = ResearchAccessRequest & {
  requester_name?: string
  requester_email?: string
  research_title?: string
  reviewer_name?: string | null
}

export type CreateAccessRequestInput = {
  researchId: string
  message: string
  guestName?: string | null
  guestEmail?: string | null
}

export type ReviewAccessRequestInput = {
  requestId: string
  status: 'approved' | 'rejected'
  reviewerNotes?: string | null
}

export type UserResearchAccessState = {
  hasFullAccess: boolean
  accessReason: 'author' | 'faculty' | 'approved_request' | 'none'
  activeRequestStatus: AccessRequestStatus | null
  requestId?: string | null
}
