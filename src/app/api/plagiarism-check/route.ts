import { NextResponse } from 'next/server'
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
  try {
    const body: PlagiarismCheckRequest = await req.json()
    const processedText = preprocessText(body.text ?? '')

    if (!processedText) {
      return NextResponse.json(
        { error: 'Please enter text to analyze for plagiarism.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.SERPAPI_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'SERPAPI_KEY is not configured on the server.' },
        { status: 500 }
      )
    }

    const sentences = splitIntoSentences(processedText)
    const topCandidates = selectTopSentences(sentences)

    if (topCandidates.length === 0) {
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
      topCandidates.map((candidate) => searchWithSerpAPI(candidate.searchFragment, apiKey))
    )

    const analysis = analyzeMatches(topCandidates, searchResults)

    return NextResponse.json({
      processedText,
      ...analysis,
    })
  } catch (error: unknown) {
    console.error('Plagiarism Check Error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal Server Error'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
