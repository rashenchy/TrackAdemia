import 'server-only'

type SupabaseClientLike = any

const ALLOWED_TYPES = new Set(['application/pdf'])
const MAX_FILE_SIZE = 20 * 1024 * 1024

function getSafeOriginalFileName(file: File) {
  const trimmed = file.name.trim()
  return trimmed.length > 0 ? trimmed : 'research.pdf'
}

function validateResearchDocument(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Only PDF files are allowed.'
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File must be under 20MB.'
  }

  return null
}

export async function uploadResearchDocument(
  supabase: SupabaseClientLike,
  userId: string,
  file: File
) {
  const validationError = validateResearchDocument(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const originalFileName = getSafeOriginalFileName(file)
  const fileExt = originalFileName.split('.').pop() || 'pdf'
  const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
  const filePath = `research-files/${userId}/${uniqueFilename}`

  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error || !data?.path) {
    throw error ?? new Error('Failed to securely upload the document.')
  }

  return {
    filePath: data.path,
    originalFileName,
  }
}
