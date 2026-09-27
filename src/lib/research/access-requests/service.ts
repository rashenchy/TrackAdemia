import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/service'
import { isFacultyRole } from '@/lib/users/access'
import type {
  CreateAccessRequestInput,
  UserResearchAccessState,
  ResearchAccessRequest,
  ResearchAccessRequestWithDetails,
} from './types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getDbClient(supabase: any) {
  return createAdminClient() ?? supabase
}

export async function createAccessRequest(input: CreateAccessRequestInput): Promise<{
  success?: boolean
  error?: string
  requestId?: string
}> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const researchId = input.researchId
  const message = input.message?.trim() || ''

  if (!researchId) {
    return { error: 'Research ID is required.' }
  }

  if (!message || message.length < 10) {
    return { error: 'Please provide a reason of at least 10 characters explaining why you need access.' }
  }

  // Fetch research to identify the Research Leader and title
  const { data: research, error: researchError } = await db
    .from('research')
    .select('id, user_id, title, status, members')
    .eq('id', researchId)
    .single()

  if (researchError || !research) {
    return { error: 'The requested research paper was not found.' }
  }

  if (research.status !== 'Published') {
    return { error: 'Access requests can only be made for published research papers.' }
  }

  let guestName: string | null = null
  let guestEmail: string | null = null
  let requesterUserId: string | null = null
  let requesterDisplayName = 'A researcher'

  if (!user) {
    return {
      error: 'Please sign in or create a free Guest Account before requesting manuscript access.',
    }
  }

  requesterUserId = user.id

  // Check if the requester is already the leader or a member
  if (research.user_id === user.id || (Array.isArray(research.members) && research.members.includes(user.id))) {
    return { error: 'You are an author of this research paper and already have full access.' }
  }

  let userProfile: any = null
  const { data: profWithInst } = await db
    .from('profiles')
    .select('first_name, last_name, role, institution, course_program')
    .eq('id', user.id)
    .maybeSingle()

  if (profWithInst) {
    userProfile = profWithInst
  } else {
    const { data: basicProf } = await db
      .from('profiles')
      .select('first_name, last_name, role, course_program')
      .eq('id', user.id)
      .maybeSingle()
    userProfile = basicProf
  }

  if (userProfile) {
    requesterDisplayName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'A researcher'
    guestName = requesterDisplayName
    guestEmail = user.email || null
  }

  // Check for existing pending or approved requests from this user
  const { data: existingRequest } = await db
    .from('research_access_requests')
    .select('id, status')
    .eq('research_id', researchId)
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingRequest) {
    if (existingRequest.status === 'approved') {
      return { error: 'You already have approved access to this research manuscript.' }
    }
    return { error: 'You already have a pending access request for this research paper.' }
  }

  // Generate a cryptographically secure token for guest access verification
  const accessToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  const { data: newRequest, error: insertError } = await db
    .from('research_access_requests')
    .insert({
      research_id: researchId,
      user_id: requesterUserId,
      guest_name: guestName,
      guest_email: guestEmail,
      message,
      status: 'pending',
      access_token: accessToken,
    })
    .select('id')
    .single()

  if (insertError || !newRequest) {
    console.error('Failed to insert access request:', insertError)
    return { error: 'Failed to submit access request. Please try again.' }
  }

  // Notify the Research Leader
  try {
    const leaderUserId = research.user_id
    if (leaderUserId) {
      await createNotification(db, {
        user_id: leaderUserId,
        actor_id: requesterUserId || leaderUserId,
        title: 'New Research Access Request',
        message: `${requesterDisplayName} requested access to "${research.title}": "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
        notification_type: 'research_access_request',
        reference_id: researchId,
        reason: newRequest.id,
      })
    }
  } catch (notifError) {
    console.error('Failed to create notification for research leader:', notifError)
  }

  return {
    success: true,
    requestId: newRequest.id,
  }
}

export async function getUserResearchAccessState(
  researchId: string,
  guestToken?: string | null
): Promise<UserResearchAccessState> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Fetch research metadata
  const { data: research } = await db
    .from('research')
    .select('id, user_id, status, members')
    .eq('id', researchId)
    .maybeSingle()

  if (!research) {
    return {
      hasFullAccess: false,
      accessReason: 'none',
      activeRequestStatus: null,
    }
  }

  // 2. If authenticated, check authorship and faculty roles
  if (user) {
    // Author or member check
    const isAuthor =
      research.user_id === user.id ||
      (Array.isArray(research.members) && research.members.includes(user.id))

    if (isAuthor) {
      return {
        hasFullAccess: true,
        accessReason: 'author',
        activeRequestStatus: null,
      }
    }

    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (isFacultyRole(profile?.role)) {
      return {
        hasFullAccess: true,
        accessReason: 'faculty',
        activeRequestStatus: null,
      }
    }

    // Check registered user's requests for this research
    const { data: request } = await db
      .from('research_access_requests')
      .select('id, status')
      .eq('research_id', researchId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (request) {
      if (request.status === 'approved') {
        return {
          hasFullAccess: true,
          accessReason: 'approved_request',
          activeRequestStatus: 'approved',
          requestId: request.id,
        }
      }

      return {
        hasFullAccess: false,
        accessReason: 'none',
        activeRequestStatus: request.status as 'pending' | 'rejected',
        requestId: request.id,
      }
    }
  }

  // 3. If guest token provided, verify token
  if (guestToken && typeof guestToken === 'string') {
    const { data: tokenRequest } = await db
      .from('research_access_requests')
      .select('id, status')
      .eq('research_id', researchId)
      .eq('access_token', guestToken.trim())
      .limit(1)
      .maybeSingle()

    if (tokenRequest && tokenRequest.status === 'approved') {
      return {
        hasFullAccess: true,
        accessReason: 'approved_request',
        activeRequestStatus: 'approved',
        requestId: tokenRequest.id,
      }
    }
  }

  return {
    hasFullAccess: false,
    accessReason: 'none',
    activeRequestStatus: null,
  }
}

export async function getResearchAccessRequests(
  researchId: string,
  currentUserId: string
): Promise<{ data?: ResearchAccessRequest[]; error?: string }> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  // Verify leader or faculty status
  const { data: research } = await db
    .from('research')
    .select('id, user_id, title')
    .eq('id', researchId)
    .single()

  if (!research) {
    return { error: 'Research not found.' }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single()

  const isLeader = research.user_id === currentUserId
  const isFaculty = isFacultyRole(profile?.role)

  if (!isLeader && !isFaculty) {
    return { error: 'You are not authorized to view access requests for this research.' }
  }

  const { data: requests, error } = await db
    .from('research_access_requests')
    .select(`
      id,
      research_id,
      user_id,
      guest_name,
      guest_email,
      message,
      status,
      access_token,
      rejection_reason,
      reviewed_at,
      reviewed_by,
      created_at
    `)
    .eq('research_id', researchId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching access requests:', error)
    return { error: 'Failed to fetch access requests.' }
  }

  // Fetch profiles for any registered users who submitted access requests
  const userIds = Array.from(
    new Set((requests || []).map((r: any) => r.user_id).filter(Boolean))
  ) as string[]

  const profileMap = new Map<
    string,
    {
      first_name: string
      last_name: string
      role?: string
      course_program?: string
    }
  >()

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, first_name, last_name, role, course_program')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((p: any) => {
        profileMap.set(p.id, {
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role,
          course_program: p.course_program,
        })
      })
    }
  }

  const formatted: ResearchAccessRequest[] = (requests || []).map((r: any) => ({
    id: r.id,
    research_id: r.research_id,
    user_id: r.user_id,
    guest_name: r.guest_name,
    guest_email: r.guest_email,
    message: r.message,
    status: r.status,
    access_token: r.access_token,
    rejection_reason: r.rejection_reason,
    reviewer_notes: r.rejection_reason,
    reviewed_at: r.reviewed_at,
    reviewed_by: r.reviewed_by,
    created_at: r.created_at,
    user_profile: r.user_id ? profileMap.get(r.user_id) : undefined,
  }))

  return { data: formatted }
}

export async function reviewAccessRequest(
  input: {
    requestId: string
    status: 'approved' | 'rejected'
    reviewerNotes?: string
  },
  reviewerUserId: string
): Promise<{ success?: boolean; error?: string; guestAccessUrl?: string }> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  const { requestId, status, reviewerNotes } = input

  if (!requestId || !['approved', 'rejected'].includes(status)) {
    return { error: 'Invalid review parameters.' }
  }

  // Fetch the request and research
  const { data: request, error: requestError } = await db
    .from('research_access_requests')
    .select('id, research_id, user_id, guest_name, guest_email, access_token, status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    return { error: 'Access request not found.' }
  }

  const { data: research } = await db
    .from('research')
    .select('id, user_id, title')
    .eq('id', request.research_id)
    .single()

  if (!research) {
    return { error: 'Associated research paper not found.' }
  }

  // Check authorization (leader or faculty)
  const { data: reviewerProfile } = await db
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', reviewerUserId)
    .single()

  const isLeader = research.user_id === reviewerUserId
  const isFaculty = isFacultyRole(reviewerProfile?.role)

  if (!isLeader && !isFaculty) {
    return { error: 'Only the Research Leader or faculty can review access requests.' }
  }

  // Update status in database
  const { error: updateError } = await db
    .from('research_access_requests')
    .update({
      status,
      rejection_reason: reviewerNotes?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerUserId,
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating access request:', updateError)
    return { error: 'Failed to update access request status.' }
  }

  const reviewerName = reviewerProfile ? `${reviewerProfile.first_name} ${reviewerProfile.last_name}` : 'The Research Leader'

  // Dispatch in-app notification if registered user
  if (request.user_id) {
    try {
      const notifType = status === 'approved' ? 'research_access_approved' : 'research_access_rejected'
      const title = status === 'approved' ? 'Research Access Approved' : 'Research Access Request Declined'
      const message = status === 'approved'
        ? `${reviewerName} approved your access request for "${research.title}". You can now view and download the full manuscript.`
        : `${reviewerName} declined your access request for "${research.title}".${reviewerNotes ? ` Note: "${reviewerNotes}"` : ''}`

      await createNotification(db, {
        user_id: request.user_id,
        actor_id: reviewerUserId,
        title,
        message,
        notification_type: notifType,
        reference_id: research.id,
        reason: requestId,
      })
    } catch (notifErr) {
      console.error('Failed to send notification to requester:', notifErr)
    }
  }

  let guestAccessUrl: string | undefined = undefined
  if (request.guest_email && status === 'approved' && request.access_token) {
    guestAccessUrl = `/repository/${research.id}?token=${request.access_token}`
  }

  return {
    success: true,
    guestAccessUrl,
  }
}

export async function getUserSubmittedAccessRequests(userId: string): Promise<{
  id: string
  researchId: string
  researchTitle: string
  status: 'pending' | 'approved' | 'rejected'
  message: string
  rejectionReason?: string | null
  createdAt: string
  reviewedAt?: string | null
}[]> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  const { data, error } = await db
    .from('research_access_requests')
    .select('id, research_id, status, message, rejection_reason, created_at, reviewed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) {
    return []
  }

  const researchIds = Array.from(new Set(data.map((r: any) => r.research_id).filter(Boolean)))
  const researchMap = new Map<string, string>()

  if (researchIds.length > 0) {
    const { data: researches } = await db
      .from('research')
      .select('id, title')
      .in('id', researchIds)

    if (researches) {
      researches.forEach((r: any) => researchMap.set(r.id, r.title))
    }
  }

  return data.map((r: any) => ({
    id: r.id,
    researchId: r.research_id,
    researchTitle: researchMap.get(r.research_id) || 'Unknown Paper',
    status: r.status,
    message: r.message,
    rejectionReason: r.rejection_reason,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  }))
}

async function getFacultyAssociatedResearchIds(db: any, facultyId: string): Promise<string[]> {
  // 1. Get sections taught by this faculty
  const { data: sections } = await db
    .from('sections')
    .select('id, course_code')
    .eq('teacher_id', facultyId)

  const sectionIds = (sections || []).map((s: any) => s.id)
  const courseCodes = (sections || [])
    .map((s: any) => s.course_code)
    .filter(Boolean) as string[]

  // 2. Get students in those sections
  let sectionStudentIds: string[] = []
  if (sectionIds.length > 0) {
    const { data: memberships } = await db
      .from('section_members')
      .select('user_id')
      .in('section_id', sectionIds)

    if (memberships) {
      sectionStudentIds = Array.from(new Set(memberships.map((m: any) => m.user_id).filter(Boolean)))
    }
  }

  // 3. Get faculty profile for name matching in case adviser_id stores name
  const { data: profile } = await db
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', facultyId)
    .single()

  const facultyFullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : ''

  // 4. Fetch researches matching any of these criteria
  const queryPromises: Promise<any>[] = [
    // Faculty is author
    db.from('research').select('id').eq('user_id', facultyId),
    // Faculty is adviser by ID
    db.from('research').select('id').eq('adviser_id', facultyId),
  ]

  if (facultyFullName) {
    queryPromises.push(db.from('research').select('id').eq('adviser_id', facultyFullName))
  }

  if (sectionStudentIds.length > 0) {
    queryPromises.push(db.from('research').select('id').in('user_id', sectionStudentIds))
  }

  if (courseCodes.length > 0) {
    queryPromises.push(db.from('research').select('id').in('subject_code', courseCodes))
  }

  const results = await Promise.all(queryPromises)
  const researchIds = new Set<string>()

  for (const res of results) {
    if (res.data) {
      for (const item of res.data) {
        if (item.id) researchIds.add(item.id)
      }
    }
  }

  return Array.from(researchIds)
}

export async function getAllLeaderAccessRequests(
  currentUserId: string,
  isFacultyUser = false
): Promise<{ data?: ResearchAccessRequestWithDetails[]; error?: string }> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  // 1. Find all research papers associated with the user
  let researchIds: string[] = []

  if (isFacultyUser) {
    researchIds = await getFacultyAssociatedResearchIds(db, currentUserId)
  } else {
    const { data: studentResearches, error: researchError } = await db
      .from('research')
      .select('id')
      .eq('user_id', currentUserId)

    if (researchError) {
      console.error('Error finding leader researches:', researchError)
      return { error: 'Failed to fetch researches.' }
    }
    researchIds = (studentResearches || []).map((r: any) => r.id)
  }

  if (researchIds.length === 0) {
    return { data: [] }
  }

  const { data: researches } = await db
    .from('research')
    .select('id, title')
    .in('id', researchIds)

  const researchMap = new Map<string, string>()
  for (const r of researches || []) {
    researchMap.set(r.id, r.title)
  }

  // 2. Fetch access requests for these researches
  const { data: requests, error: requestsError } = await db
    .from('research_access_requests')
    .select(`
      id,
      research_id,
      user_id,
      guest_name,
      guest_email,
      message,
      status,
      access_token,
      rejection_reason,
      reviewed_at,
      reviewed_by,
      created_at
    `)
    .in('research_id', researchIds)
    .order('created_at', { ascending: false })

  if (requestsError) {
    console.error('Error fetching access requests:', requestsError)
    return { error: 'Failed to fetch access requests.' }
  }

  if (!requests || requests.length === 0) {
    return { data: [] }
  }

  // 3. Fetch user profiles for registered users
  const userIds = Array.from(
    new Set((requests || []).map((r: any) => r.user_id).filter(Boolean))
  ) as string[]

  const profileMap = new Map<
    string,
    {
      first_name: string
      last_name: string
      role?: string
      course_program?: string
    }
  >()

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, first_name, last_name, role, course_program')
      .in('id', userIds)

    if (profiles) {
      profiles.forEach((p: any) => {
        profileMap.set(p.id, {
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role,
          course_program: p.course_program,
        })
      })
    }
  }

  const formatted: ResearchAccessRequestWithDetails[] = requests.map((r: any) => {
    const registeredProfile = r.user_id ? profileMap.get(r.user_id) : undefined
    const requesterName = registeredProfile
      ? `${registeredProfile.first_name} ${registeredProfile.last_name}`.trim()
      : r.guest_name || 'Guest Requester'
    const requesterEmail = registeredProfile ? undefined : r.guest_email || undefined

    return {
      id: r.id,
      research_id: r.research_id,
      user_id: r.user_id,
      guest_name: r.guest_name,
      guest_email: r.guest_email,
      message: r.message,
      status: r.status,
      access_token: r.access_token,
      rejection_reason: r.rejection_reason,
      reviewer_notes: r.rejection_reason,
      reviewed_at: r.reviewed_at,
      reviewed_by: r.reviewed_by,
      created_at: r.created_at,
      user_profile: registeredProfile,
      requester_name: requesterName,
      requester_email: requesterEmail,
      research_title: researchMap.get(r.research_id) || 'Research Manuscript',
    }
  })

  return { data: formatted }
}

export async function getLeaderPendingAccessRequestsCount(
  currentUserId: string,
  isFacultyUser = false
): Promise<number> {
  const supabase = await createClient()
  const db = getDbClient(supabase)

  let researchIds: string[] = []
  if (isFacultyUser) {
    researchIds = await getFacultyAssociatedResearchIds(db, currentUserId)
  } else {
    const { data: studentResearches } = await db
      .from('research')
      .select('id')
      .eq('user_id', currentUserId)
    researchIds = (studentResearches || []).map((r: any) => r.id)
  }

  if (researchIds.length === 0) return 0

  const { count, error } = await db
    .from('research_access_requests')
    .select('*', { count: 'exact', head: true })
    .in('research_id', researchIds)
    .eq('status', 'pending')

  if (error || !count) return 0
  return count
}


