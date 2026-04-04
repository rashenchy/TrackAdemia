import nlp from 'compromise'
import { eng, removeStopwords as removeStopwordTokens } from 'stopword'

const MIN_FILTERED_TOKENS = 4
const MAX_SEARCH_CANDIDATES = 3

const combinedStopwords = new Set(eng.map((word) => word.toLowerCase()))

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? []
}

function stemTokens(tokens: string[]): string[] {
  return tokens
}

export interface SentenceFragment {
  text: string
  start: number
  end: number
}

export interface CandidateSentence extends SentenceFragment {
  filteredTokens: string[]
  score: number
  searchFragment: string
}

export interface SearchResult {
  title: string
  link: string
  snippet: string
  source?: string
}

interface SerpApiOrganicResult {
  title?: string
  link?: string
  snippet?: string
  source?: string
  displayed_link?: string
  rich_snippet?: {
    top?: {
      extensions?: string[]
    }
  }
}

export interface MatchResult extends SearchResult {
  matchScore: number
  matchedTerms: string[]
  suspectedText: string
}

export interface CandidateAnalysis extends CandidateSentence {
  matches: MatchResult[]
}

export interface PlagiarismRiskSummary {
  level: 'Low' | 'Medium' | 'High'
  score: number
  searchedCandidates: number
  matchedCandidates: number
  message: string
}

export function preprocessText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitIntoSentences(text: string): SentenceFragment[] {
  const sentenceTexts = nlp(text).sentences().out('array') as string[]
  const sentences: SentenceFragment[] = []
  let cursor = 0

  for (const sentenceText of sentenceTexts) {
    const trimmedText = sentenceText.trim()

    if (!trimmedText) {
      continue
    }

    const start = text.indexOf(trimmedText, cursor)
    const resolvedStart = start >= 0 ? start : cursor
    const end = resolvedStart + trimmedText.length

    sentences.push({
      text: trimmedText,
      start: resolvedStart,
      end,
    })

    cursor = end
  }

  return sentences
}

export function removeStopwords(text: string): string[] {
  const tokens = tokenize(text)
  const filtered = removeStopwordTokens(tokens, eng)

  return [...new Set(filtered)]
    .filter((token) => token.length > 2 && !/^\d+$/.test(token))
    .filter((token) => !combinedStopwords.has(token))
}

export function scoreSentenceUniqueness(
  sentence: SentenceFragment,
  frequencyMap: Map<string, number>
) {
  const allTokens = tokenize(sentence.text)
  const filteredTokens = removeStopwords(sentence.text)
  const stemmedTokens = [...new Set(stemTokens(filteredTokens))]
  const stopwordRatio =
    allTokens.length === 0 ? 1 : 1 - filteredTokens.length / allTokens.length

  if (
    allTokens.length < 6 ||
    filteredTokens.length < MIN_FILTERED_TOKENS ||
    stemmedTokens.length < 3 ||
    stopwordRatio > 0.82
  ) {
    return {
      filteredTokens,
      score: 0,
    }
  }

  const rarityScore =
    stemmedTokens.reduce((total, token) => {
      const frequency = frequencyMap.get(token) ?? 1
      return total + 1 / frequency
    }, 0) / stemmedTokens.length

  const lexicalDensity = filteredTokens.length / Math.max(allTokens.length, 1)
  const longWordBoost =
    filteredTokens.filter((token) => token.length >= 8).length * 0.12

  const namedEntityBoost =
    (nlp(sentence.text).people().out('array') as string[]).length * 0.2 +
    (nlp(sentence.text).places().out('array') as string[]).length * 0.15 +
    (nlp(sentence.text).organizations().out('array') as string[]).length * 0.18

  const numericBoost = /\d/.test(sentence.text) ? 0.18 : 0
  const lengthPenalty = allTokens.length > 40 ? 0.2 : 0

  return {
    filteredTokens,
    score:
      rarityScore * 2.2 +
      lexicalDensity +
      longWordBoost +
      namedEntityBoost +
      numericBoost -
      lengthPenalty,
  }
}

function buildSearchFragment(
  sentence: SentenceFragment,
  filteredTokens: string[],
  frequencyMap: Map<string, number>
): string {
  const words = sentence.text.split(/\s+/)

  if (words.length <= 18) {
    return sentence.text
  }

  const rareTokenWeight = new Map(
    [...new Set(stemTokens(filteredTokens))].map((token) => [
      token,
      1 / (frequencyMap.get(token) ?? 1),
    ])
  )

  let bestFragment = words.slice(0, 18).join(' ')
  let bestScore = 0

  for (let windowSize = 8; windowSize <= Math.min(words.length, 18); windowSize += 1) {
    for (let start = 0; start <= words.length - windowSize; start += 1) {
      const fragmentWords = words.slice(start, start + windowSize)
      const fragmentText = fragmentWords.join(' ')
      const fragmentTokens = stemTokens(removeStopwords(fragmentText))

      const score = fragmentTokens.reduce((total, token) => {
        return total + (rareTokenWeight.get(token) ?? 0)
      }, 0)

      if (score > bestScore) {
        bestScore = score
        bestFragment = fragmentText
      }
    }
  }

  return bestFragment.replace(/^[,;:]+|[,;:]+$/g, '').trim()
}

export function selectTopSentences(sentences: SentenceFragment[]): CandidateSentence[] {
  const frequencyMap = new Map<string, number>()

  for (const sentence of sentences) {
    for (const token of stemTokens(removeStopwords(sentence.text))) {
      frequencyMap.set(token, (frequencyMap.get(token) ?? 0) + 1)
    }
  }

  const scoredCandidates = sentences
    .map((sentence) => {
      const { filteredTokens, score } = scoreSentenceUniqueness(sentence, frequencyMap)

      return {
        ...sentence,
        filteredTokens,
        score,
        searchFragment: buildSearchFragment(sentence, filteredTokens, frequencyMap),
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((first, second) => second.score - first.score)

  const uniqueCandidates: CandidateSentence[] = []
  const seenQueries = new Set<string>()

  for (const candidate of scoredCandidates) {
    const signature = candidate.searchFragment.toLowerCase()

    if (seenQueries.has(signature)) {
      continue
    }

    uniqueCandidates.push(candidate)
    seenQueries.add(signature)

    if (uniqueCandidates.length === MAX_SEARCH_CANDIDATES) {
      break
    }
  }

  return uniqueCandidates
}

export async function searchWithSerpAPI(query: string, apiKey: string): Promise<SearchResult[]> {
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is missing.')
  }

  const cleanedQuery = query.trim()

  if (!cleanedQuery) {
    throw new Error('Search query is empty.')
  }

  const params = new URLSearchParams({
    engine: 'google',
    q: `"${cleanedQuery}"`,
    api_key: apiKey,
    num: '5',
  })

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  const rawText = await response.text()

  let data:
    | { organic_results?: SerpApiOrganicResult[]; error?: string }
    | { raw: string }

  try {
    data = JSON.parse(rawText)
  } catch {
    data = { raw: rawText }
  }

  if (!response.ok) {
    const errorMessage =
      'error' in data && data.error
        ? data.error
        : 'raw' in data
          ? data.raw
          : 'Unknown search error'

    throw new Error(`Search request failed (${response.status}): ${errorMessage}`)
  }

  const organicResults =
    'organic_results' in data && Array.isArray(data.organic_results)
      ? data.organic_results
      : []

  return organicResults.map((result) => ({
    title: result.title ?? 'Untitled result',
    link: result.link ?? '',
    snippet: result.snippet ?? result.rich_snippet?.top?.extensions?.join(' ') ?? '',
    source: result.source ?? result.displayed_link ?? '',
  }))
}

export function analyzeMatches(
  candidates: CandidateSentence[],
  searchResults: SearchResult[][]
) {
  const analyzedCandidates: CandidateAnalysis[] = candidates.map((candidate, index) => {
    const candidateTerms = [...new Set(candidate.filteredTokens)]
    const candidateStems = new Set(stemTokens(candidateTerms))

    const matches = (searchResults[index] ?? [])
      .map((result) => {
        const resultText = `${result.title} ${result.snippet}`.toLowerCase()
        const resultTerms = removeStopwords(resultText)
        const resultStems = new Set(stemTokens(resultTerms))

        const matchedTerms = candidateTerms.filter((term) => resultStems.has(term))

        const overlapScore =
          matchedTerms.length / Math.max(candidateTerms.length, 1)

        const stemOverlap =
          [...candidateStems].filter((stem) => resultStems.has(stem)).length /
          Math.max(candidateStems.size, 1)

        const phraseScore = resultText.includes(candidate.searchFragment.toLowerCase())
          ? 0.35
          : 0

        const matchScore = Number(
          Math.min(overlapScore * 0.55 + stemOverlap * 0.45 + phraseScore, 1).toFixed(2)
        )

        return {
          ...result,
          matchScore,
          matchedTerms,
          suspectedText: candidate.text,
        }
      })
      .filter((result) => result.matchScore >= 0.18)
      .sort((first, second) => second.matchScore - first.matchScore)
      .slice(0, 3)

    return {
      ...candidate,
      matches,
    }
  })

  const matchedCandidates = analyzedCandidates.filter(
    (candidate) => candidate.matches.length > 0
  )

  const strongestScore = Math.max(
    0,
    ...matchedCandidates.flatMap((candidate) =>
      candidate.matches.map((match) => match.matchScore)
    )
  )

  let level: PlagiarismRiskSummary['level'] = 'Low'
  if (matchedCandidates.length >= 2 || strongestScore >= 0.65) {
    level = 'Medium'
  }
  if (matchedCandidates.length >= 3 || strongestScore >= 0.8) {
    level = 'High'
  }

  const score = Number(
    Math.min(
      matchedCandidates.length / Math.max(candidates.length, 1) + strongestScore,
      1
    ).toFixed(2)
  )

  const highlights = matchedCandidates.map((candidate) => ({
    text: candidate.text,
    start: candidate.start,
    end: candidate.end,
  }))

  const summary: PlagiarismRiskSummary = {
    level,
    score,
    searchedCandidates: candidates.length,
    matchedCandidates: matchedCandidates.length,
    message:
      level === 'Low'
        ? 'No strong matches were found in the most distinctive fragments.'
        : level === 'Medium'
          ? 'Some parts of the text match existing online content and should be reviewed.'
          : 'Several high-signal fragments match existing online content and need close review.',
  }

  return {
    candidates: analyzedCandidates,
    highlights,
    summary,
  }
}