import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logApiRequest } from '@/lib/api-monitoring'

interface GrammarCheckRequest {
  text: string
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const logRequest = async (
    status: 'success' | 'failed' | 'validation_error',
    textLength: number,
    issuesFound: number,
    errorMessage?: string
  ) => {
    await logApiRequest({
      provider: 'gemini',
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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      await logRequest(
        'failed',
        trimmedText.length,
        0,
        'Gemini API key is not configured on the server.'
      )
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                corrections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      original_sentence: { type: 'string' },
                      corrected_sentence: { type: 'string' },
                      explanation: { type: 'string' },
                    },
                    required: [
                      'original_sentence',
                      'corrected_sentence',
                      'explanation',
                    ],
                  },
                },
              },
              required: ['corrections'],
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      const message =
        errorData.error?.message || 'Failed to communicate with Gemini API'
      await logRequest('failed', trimmedText.length, 0, message)
      throw new Error(message)
    }

    const data = await response.json()

    const resultText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.output?.text

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
      parsed = JSON.parse(resultText)
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
