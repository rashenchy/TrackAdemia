import 'server-only'

type SupabaseStorageClientLike = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        file: File,
        options: {
          cacheControl: string
          upsert: boolean
          contentType: string
        }
      ): Promise<{ data: { path?: string } | null; error: Error | null }>
    }
  }
}

const ALLOWED_TYPES = new Set(['application/pdf'])
const MAX_FILE_SIZE = 20 * 1024 * 1024

function getSafeOriginalFileName(file: File) {
  const trimmed = file.name.trim()
  return trimmed.length > 0 ? trimmed : 'research.pdf'
}

function validateResearchDocument(file: File) {
  const normalizedName = file.name.trim().toLowerCase()

  if (!normalizedName.endsWith('.pdf')) {
    return 'Only PDF files are allowed.'
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Only PDF files are allowed.'
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File must be under 20MB.'
  }

  return null
}

export async function uploadResearchDocument(
  supabase: SupabaseStorageClientLike,
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

const ALLOWED_DIAGRAM_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
])
const MAX_DIAGRAM_SIZE = 15 * 1024 * 1024

function validateDiagramImage(file: File) {
  const normalizedName = file.name.trim().toLowerCase()
  const validExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
  const hasValidExt = validExtensions.some((ext) => normalizedName.endsWith(ext))

  if (!hasValidExt && !ALLOWED_DIAGRAM_TYPES.has(file.type)) {
    return 'Only PNG, JPEG, SVG, or WebP diagram images are allowed.'
  }

  if (file.size > MAX_DIAGRAM_SIZE) {
    return 'Diagram image must be under 15MB.'
  }

  return null
}

export async function uploadResearchDiagram(
  supabase: SupabaseStorageClientLike,
  userId: string,
  file: File
) {
  const validationError = validateDiagramImage(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const originalFileName = getSafeOriginalFileName(file)
  const fileExt = originalFileName.split('.').pop() || 'png'
  const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
  const filePath = `diagrams/${userId}/${uniqueFilename}`

  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png',
    })

  if (error || !data?.path) {
    throw error ?? new Error('Failed to securely upload the diagram.')
  }

  return {
    filePath: data.path,
    originalFileName,
  }
}

const MAX_SOURCE_CODE_SIZE = 50 * 1024 * 1024

function validateSourceCodeArchive(file: File) {
  const normalizedName = file.name.trim().toLowerCase()

  if (!normalizedName.endsWith('.zip')) {
    return 'Source code archive must be a .zip file.'
  }

  if (file.size > MAX_SOURCE_CODE_SIZE) {
    return 'Source code archive must be under 50MB.'
  }

  return null
}

export async function uploadSourceCodeArchive(
  supabase: SupabaseStorageClientLike,
  userId: string,
  file: File
) {
  const validationError = validateSourceCodeArchive(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const originalFileName = getSafeOriginalFileName(file)
  const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.zip`
  const filePath = `source-code/${userId}/${uniqueFilename}`

  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/zip',
    })

  if (error || !data?.path) {
    throw error ?? new Error('Failed to securely upload the source code archive.')
  }

  return {
    filePath: data.path,
    originalFileName,
  }
}

