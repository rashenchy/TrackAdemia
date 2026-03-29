import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logApiRequest } from '@/lib/api-monitoring'
import {
  analyzeMatches,
  preprocessText,
  searchWithSerpAPI,
  selectTopSentences,
  splitIntoSentences,
} from '@/lib/plagiarism'

interface PlagiarismCheckRequest {
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
    matchesFound: number,
    queryCount: number,
    errorMessage?: string
  ) => {
    await logApiRequest({
      provider: 'serpapi',
      apiName: 'plagiarism_check',
      endpoint: '/api/plagiarism-check',
      userId: user?.id ?? null,
      status,
      responseTimeMs: Date.now() - startedAt,
      inputUnits: textLength,
      outputUnits: matchesFound,
      errorMessage,
      metadata: {
        tool: 'plagiarism_checker',
        query_count: queryCount,
      },
    })
  }

  try {
    const body: PlagiarismCheckRequest = await req.json()
    const processedText = preprocessText(body.text ?? '')

    if (!processedText) {
      await logRequest(
        'validation_error',
        0,
        0,
        0,
        'Please enter text to analyze for plagiarism.'
      )
      return NextResponse.json(
        { error: 'Please enter text to analyze for plagiarism.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.SERPAPI_KEY

    if (!apiKey) {
      await logRequest(
        'failed',
        processedText.length,
        0,
        0,
        'SERPAPI_KEY is not configured on the server.'
      )
      return NextResponse.json(
        { error: 'SERPAPI_KEY is not configured on the server.' },
        { status: 500 }
      )
    }

    const sentences = splitIntoSentences(processedText)
    const topCandidates = selectTopSentences(sentences)

    if (topCandidates.length === 0) {
      await logRequest('success', processedText.length, 0, 0)
      return NextResponse.json({
        processedText,
        candidates: [],
        highlights: [],
        summary: {
          level: 'Low',
          score: 0,
          searchedCandidates: 0,
          matchedCandidates: 0,
          message: 'No matches found.',
        },
      })
    }

    const searchResults = await Promise.all(
      topCandidates.map((candidate) =>
        searchWithSerpAPI(candidate.searchFragment, apiKey)
      )
    )

    const analysis = analyzeMatches(topCandidates, searchResults)

    await logRequest(
      'success',
      processedText.length,
      analysis.summary.matchedCandidates,
      topCandidates.length
    )

    return NextResponse.json({
      processedText,
      ...analysis,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Plagiarism Check Error:', error)
    await logRequest('failed', 0, 0, 0, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
