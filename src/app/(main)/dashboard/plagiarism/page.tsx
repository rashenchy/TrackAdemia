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
  Link2,
  Loader2,
  Search,
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

export default function PlagiarismCheckerPage() {
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState<PlagiarismResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze.')
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
        throw new Error(data.error || 'Failed to analyze plagiarism.')
      }

      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze plagiarism.')
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
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-blue-200 bg-blue-50/60 p-8 text-center dark:border-blue-900 dark:bg-blue-950/20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--foreground)]">
              Analyzing distinctive fragments...
            </p>
            <p className="text-sm text-gray-500">
              Filtering the text, ranking sentence uniqueness, and checking only
              the strongest candidate fragments.
            </p>
          </div>
        </div>
      )
    }

    if (!result) {
      return (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/30">
          <ShieldAlert size={40} className="opacity-30" />
          <div className="space-y-1">
            <p className="font-medium text-[var(--foreground)]">
              No plagiarism analysis yet
            </p>
            <p className="text-sm">
              Paste long-form text above and the checker will inspect only the
              most distinctive fragments for possible matches.
            </p>
          </div>
        </div>
      )
    }

    const riskTone =
      result.summary.level === 'High'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300'
        : result.summary.level === 'Medium'
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300'

    return (
      <div className="space-y-6">
        <div className={`rounded-3xl border p-6 ${riskTone}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                Overall Plagiarism Risk
              </p>
              <h2 className="mt-1 text-2xl font-bold">{result.summary.level}</h2>
              <p className="mt-2 text-sm">{result.summary.message}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/60 p-3 dark:bg-black/20">
                <p className="text-xs uppercase tracking-wide">Score</p>
                <p className="mt-1 text-xl font-bold">
                  {Math.round(result.summary.score * 100)}%
                </p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 dark:bg-black/20">
                <p className="text-xs uppercase tracking-wide">Queries</p>
                <p className="mt-1 text-xl font-bold">
                  {result.summary.searchedCandidates}
                </p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 dark:bg-black/20">
                <p className="text-xs uppercase tracking-wide">Matches</p>
                <p className="mt-1 text-xl font-bold">
                  {result.summary.matchedCandidates}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
              <Highlighter className="text-red-500" size={20} />
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Matched / Suspected Text Highlights
              </h3>
            </div>
            {renderTextWithHighlights(result.processedText, result.highlights)}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
              <Search className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Checked Fragments
              </h3>
            </div>
            <div className="space-y-4">
              {result.candidates.map((candidate, index) => (
                <details
                  key={`${candidate.searchFragment}-${index}`}
                  className="group rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-500">
                        Fragment {index + 1}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--foreground)]">
                        {candidate.searchFragment}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          candidate.matches.length > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        {candidate.matches.length > 0 ? 'Match found' : 'No match'}
                      </span>
                      <ChevronDown
                        size={18}
                        className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                      />
                    </div>
                  </summary>
                  <div className="border-t border-gray-200 p-4 pt-4 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Candidate details
                      </p>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        Specificity {candidate.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                      Checked fragment
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">
                      {candidate.searchFragment}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                      Suspected text
                    </p>
                    <p className="mt-1 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-gray-700 dark:bg-gray-950/60 dark:text-gray-300">
                      {candidate.text}
                    </p>
                    <p className="mt-3 text-xs text-gray-500">
                      {candidate.matches.length > 0
                        ? `${candidate.matches.length} possible source match(es) found`
                        : 'No strong match found for this fragment'}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
            <Link2 className="text-violet-600" size={20} />
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Matched Sources
            </h3>
          </div>

          <div className="space-y-5">
            {result.candidates.map((candidate, candidateIndex) => (
              <div key={`matches-${candidateIndex}`} className="space-y-3">
                <details
                  open={candidate.matches.length > 0}
                  className="group rounded-2xl bg-gray-50 dark:bg-gray-900/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Fragment {candidateIndex + 1}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground)]">
                        {candidate.searchFragment}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          candidate.matches.length > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        {candidate.matches.length > 0 ? 'Match found' : 'No match'}
                      </span>
                      <ChevronDown
                        size={18}
                        className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                      />
                    </div>
                  </summary>

                  <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
                    {candidate.matches.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">
                        No matching results cleared the overlap threshold for this
                        fragment.
                      </div>
                    ) : (
                      candidate.matches.map((match, matchIndex) => (
                        <details
                          key={`${match.link}-${matchIndex}`}
                          className="group rounded-2xl border border-gray-200 dark:border-gray-800"
                        >
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Source title
                              </p>
                              <h4 className="mt-2 line-clamp-2 text-lg font-bold text-[var(--foreground)]">
                                {match.title}
                              </h4>
                              <p className="mt-2 text-sm text-gray-500">
                                {Math.round(match.matchScore * 100)}% match confidence
                              </p>
                            </div>
                            <ChevronDown
                              size={18}
                              className="mt-1 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                            />
                          </summary>

                          <div className="border-t border-gray-200 p-5 pt-4 dark:border-gray-800">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-2">
                                <h4 className="text-lg font-bold text-[var(--foreground)]">
                                  {match.title}
                                </h4>
                                <a
                                  href={match.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink size={16} />
                                  {match.link}
                                </a>
                              </div>
                              <div className="rounded-2xl bg-amber-50 px-4 py-2 text-right text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                <p className="text-xs uppercase tracking-wide">
                                  Match score
                                </p>
                                <p className="text-lg font-bold">
                                  {Math.round(match.matchScore * 100)}%
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                <p className="text-sm font-semibold text-[var(--foreground)]">
                                  Preview / snippet
                                </p>
                                <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                  {renderHighlightedTerms(
                                    match.snippet || 'No preview text was returned.',
                                    match.matchedTerms
                                  )}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
                                <p className="text-sm font-semibold text-[var(--foreground)]">
                                  Matched text highlight
                                </p>
                                <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                  {renderHighlightedTerms(
                                    match.suspectedText,
                                    match.matchedTerms
                                  )}
                                </p>
                              </div>
                            </div>

                            {match.source && (
                              <p className="mt-3 text-xs text-gray-500">
                                Source: {match.source}
                              </p>
                            )}
                          </div>
                        </details>
                      ))
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          <ShieldAlert className="text-red-500" size={32} />
          Plagiarism Checker
        </h1>
        <p className="mt-1 text-gray-500">
          Upload long-form writing, rank only the most distinctive fragments,
          and check whether those parts match existing online content.
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
        <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Text for Analysis
          </h2>
        </div>

        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Paste your essay, report, or chapter here. The checker will preprocess it, ignore generic content, and search only up to three high-signal fragments."
          className="min-h-[340px] w-full resize-y rounded-2xl border border-gray-300 bg-transparent p-4 leading-7 text-[var(--foreground)] outline-none transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-700"
        />

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500">
            No strict word limit. The checker filters common language and
            focuses only on the strongest candidate fragments.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !inputText.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 font-bold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Analyze Plagiarism
              </>
            )}
          </button>
        </div>
      </section>

      {renderResults()}
    </div>
  )
}
