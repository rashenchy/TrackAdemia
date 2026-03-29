'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  FileText,
  Highlighter,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

interface MatchResult {
  title: string
  link: string
  snippet: string
  source?: string
  matchScore: number
  matchedTerms: string[]
  suspectedText: string
}

interface CandidateResult {
  text: string
  score: number
  searchFragment: string
  matches: MatchResult[]
}

interface RiskSummary {
  level: 'Low' | 'Medium' | 'High'
  score: number
  searchedCandidates: number
  matchedCandidates: number
  message: string
}

interface HighlightRange {
  text: string
  start: number
  end: number
}

interface PlagiarismResponse {
  processedText: string
  candidates: CandidateResult[]
  highlights: HighlightRange[]
  summary: RiskSummary
}

interface DisplayMatch {
  suspiciousText: string
  matchingText: string
  title: string
  link: string
  source?: string
  matchedTerms: string[]
  score: number
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderHighlightedTerms(text: string, terms: string[]) {
  if (!terms.length) {
    return <span>{text}</span>
  }

  const uniqueTerms = [...new Set(terms.filter(Boolean))].sort(
    (first, second) => second.length - first.length
  )

  if (!uniqueTerms.length) {
    return <span>{text}</span>
  }

  const pattern = new RegExp(`(${uniqueTerms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = uniqueTerms.some(
          (term) => part.toLowerCase() === term.toLowerCase()
        )

        return isMatch ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-amber-200/80 px-1 text-amber-950"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      })}
    </>
  )
}

function renderTextWithHighlights(text: string, highlights: HighlightRange[]) {
  if (!highlights.length) {
    return (
      <p className="whitespace-pre-wrap leading-7 text-gray-700 dark:text-gray-300">
        {text}
      </p>
    )
  }

  const sortedHighlights = [...highlights].sort(
    (first, second) => first.start - second.start
  )
  const fragments: ReactNode[] = []
  let currentIndex = 0

  sortedHighlights.forEach((highlight, index) => {
    if (highlight.start > currentIndex) {
      fragments.push(
        <span key={`text-${index}`}>{text.slice(currentIndex, highlight.start)}</span>
      )
    }

    fragments.push(
      <mark
        key={`highlight-${index}`}
        className="rounded bg-red-200/80 px-1.5 py-0.5 text-red-950"
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>
    )

    currentIndex = highlight.end
  })

  if (currentIndex < text.length) {
    fragments.push(<span key="tail">{text.slice(currentIndex)}</span>)
  }

  return (
    <p className="whitespace-pre-wrap leading-7 text-gray-700 dark:text-gray-300">
      {fragments}
    </p>
  )
}

function buildDisplayMatches(result: PlagiarismResponse): DisplayMatch[] {
  return result.candidates.flatMap((candidate) =>
    candidate.matches.map((match) => ({
      suspiciousText: candidate.text,
      matchingText: match.snippet || match.title,
      title: match.title,
      link: match.link,
      source: match.source,
      matchedTerms: match.matchedTerms,
      score: match.matchScore,
    }))
  )
}

export default function PlagiarismCheckerPage() {
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<PlagiarismResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to check.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/plagiarism-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check plagiarism.')
      }

      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check plagiarism.')
    } finally {
      setIsLoading(false)
    }
  }

  function renderResults() {
    if (error) {
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-blue-200 bg-blue-50/60 p-8 text-center dark:border-blue-900 dark:bg-blue-950/20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--foreground)]">
              Checking plagiarism...
            </p>
            <p className="text-sm text-gray-500">
              Reviewing your text and comparing suspicious sections against
              possible matches.
            </p>
          </div>
        </div>
      )
    }

    if (!result) {
      return (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/30">
          <ShieldAlert size={40} className="opacity-30" />
          <div className="space-y-1">
            <p className="font-medium text-[var(--foreground)]">
              No plagiarism check yet
            </p>
            <p className="text-sm">
              Add text above, then run a plagiarism check to see whether any
              suspicious matches are found.
            </p>
          </div>
        </div>
      )
    }

    const matches = buildDisplayMatches(result)

    if (matches.length === 0) {
      return (
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">
              Result
            </p>
            <h2 className="mt-2 text-2xl font-bold">No matches found</h2>
            <p className="mt-2 text-sm">
              The checker did not find suspicious matches in the submitted text.
            </p>
          </div>

          <details className="group rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-6">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-600" size={20} />
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Checked Text
                </h3>
              </div>

              <ChevronDown
                size={20}
                className="transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="border-t border-gray-200 px-6 pb-6 dark:border-gray-800">
              <p className="whitespace-pre-wrap leading-7 text-gray-700 dark:text-gray-300">
                {result.processedText}
              </p>
            </div>
          </details>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">
            Result
          </p>
          <h2 className="mt-2 text-2xl font-bold">Possible matches found</h2>
          <p className="mt-2 text-sm">
            Suspicious text and its closest matching passages are shown below.
          </p>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
            <Highlighter className="text-red-500" size={20} />
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Suspicious Text Highlights
            </h3>
          </div>
          {renderTextWithHighlights(result.processedText, result.highlights)}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
            <ShieldAlert className="text-amber-600" size={20} />
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Match Details
            </h3>
          </div>

          <div className="space-y-4">
            {matches.map((match, index) => (
              <details
                key={`${match.link}-${index}`}
                open={index === 0}
                className="group rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-500">
                      Match {index + 1}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--foreground)]">
                      {match.suspiciousText}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      {Math.round(match.score * 100)}% match
                    </span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                    />
                  </div>
                </summary>

                <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 dark:bg-gray-950/60">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Suspicious text
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                        {renderHighlightedTerms(
                          match.suspiciousText,
                          match.matchedTerms
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 dark:bg-gray-950/60">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Matching text
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                        {renderHighlightedTerms(
                          match.matchingText || 'No matching text preview available.',
                          match.matchedTerms
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500">
                    <p className="font-semibold text-[var(--foreground)]">
                      {match.title}
                    </p>
                    <a
                      href={match.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink size={16} />
                      {match.link}
                    </a>
                    {match.source && <p>Source: {match.source}</p>}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          <ShieldAlert className="text-red-500" size={32} />
          Plagiarism Checker
        </h1>
        <p className="mt-1 text-gray-500">
          Add text below and check for possible plagiarism matches.
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
        <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Add text here
          </h2>
        </div>

        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Paste your text here to check plagiarism..."
          className="min-h-[340px] w-full resize-y rounded-2xl border border-gray-300 bg-transparent p-4 leading-7 text-[var(--foreground)] outline-none transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-700"
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !inputText.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 font-bold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Check Plagiarism
              </>
            )}
          </button>
        </div>
      </section>

      {renderResults()}
    </div>
  )
}
