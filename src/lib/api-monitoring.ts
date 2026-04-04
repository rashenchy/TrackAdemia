import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type MonitoredProvider = 'gemini' | 'groq' | 'serpapi' | 'supabase'
export type MonitoredStatus = 'success' | 'failed' | 'validation_error'

export interface ApiRequestLogInput {
  provider: MonitoredProvider
  apiName: string
  endpoint?: string
  userId?: string | null
  status: MonitoredStatus
  responseTimeMs: number
  inputUnits?: number
  outputUnits?: number
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

export async function logApiRequest(input: ApiRequestLogInput) {
  try {
    const supabase = createAdminClient() ?? await createClient()

    const { error } = await supabase.from('api_request_logs').insert({
      provider: input.provider,
      api_name: input.apiName,
      endpoint: input.endpoint ?? null,
      user_id: input.userId ?? null,
      status: input.status,
      response_time_ms: Math.max(0, Math.round(input.responseTimeMs)),
      input_units: Math.max(0, Math.round(input.inputUnits ?? 0)),
      output_units: Math.max(0, Math.round(input.outputUnits ?? 0)),
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    })

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to write api monitoring log:', error)
  }
}
