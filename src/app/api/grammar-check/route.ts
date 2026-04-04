import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logApiRequest } from '@/lib/api-monitoring'

interface GrammarCheckRequest {
  text: string
}

function extractJsonBlock(value: string) {
  const trimmed = value.trim()

  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
  }

  return trimmed
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let processedTextLength = 0

  const logRequest = async (
    status: 'success' | 'failed' | 'validation_error',
    textLength: number,
    issuesFound: number,
    errorMessage?: string
  ) => {
    await logApiRequest({
      provider: 'groq',
      apiName: 'grammar_check',
      endpoint: '/api/grammar-check',
      userId: user?.id ?? null,
      status,
      responseTimeMs: Date.now() - startedAt,
      inputUnits: textLength,
      outputUnits: issuesFound,
      errorMessage,
      metadata: {
        tool: 'grammar_checker',
      },
    })
  }

  try {
    const body: GrammarCheckRequest = await req.json()
    const text = body.text ?? ''
    const trimmedText = text.trim()
    processedTextLength = trimmedText.length

    if (!trimmedText) {
      await logRequest('validation_error', 0, 0, 'Please provide text to check.')
      return NextResponse.json(
        { error: 'Please provide text to check.' },
        { status: 400 }
      )
    }

    if (trimmedText.length > 3000) {
      await logRequest(
        'validation_error',
        trimmedText.length,
        0,
        'Text exceeds the 3000 character limit.'
      )
      return NextResponse.json(
        { error: 'Text exceeds the 3000 character limit.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      await logRequest(
        'failed',
        trimmedText.length,
        0,
        'Groq API key is not configured on the server.'
      )
      return NextResponse.json(
        { error: 'Groq API key is not configured on the server.' },
        { status: 500 }
      )
    }

    const prompt = `
    Detect grammar mistakes in the text.

    Return ONLY JSON in this format:

    {
    "corrections":[
        {
        "original_sentence":"",
        "corrected_sentence":"",
        "explanation":""
        }
    ]
    }

    Rules:
    - Return the FULL sentence containing the grammar mistake.
    - Provide the corrected version of the entire sentence.
    - Do NOT return only phrases.
    - Do not rewrite sentences that are already correct.
    - Preserve the original tense unless the tense itself is incorrect.
    - If no errors exist return {"corrections":[]}

    Text:
    """${trimmedText}"""
    `

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a grammar checker. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const message =
        errorData?.error?.message || 'Failed to communicate with Groq API'
      await logRequest('failed', trimmedText.length, 0, message)
      throw new Error(message)
    }

    const data = await response.json()

    const resultText =
      data?.choices?.[0]?.message?.content

    if (!resultText) {
      await logRequest(
        'failed',
        trimmedText.length,
        0,
        'No valid response generated from the model.'
      )
      throw new Error('No valid response generated from the model.')
    }

    let parsed: {
      corrections?: Array<{
        original_sentence: string
        corrected_sentence: string
        explanation: string
      }>
    }

    try {
      parsed = JSON.parse(extractJsonBlock(resultText))
    } catch {
      parsed = { corrections: [] }
    }

    if (!parsed.corrections) {
      parsed.corrections = []
    }

    await logRequest('success', trimmedText.length, parsed.corrections.length)
    return NextResponse.json(parsed)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Grammar Check Error:', error)
    await logRequest('failed', processedTextLength, 0, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
