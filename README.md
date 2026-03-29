# TrackAdemia Dashboard Tools

This project includes dashboard utilities such as the grammar checker and a plagiarism checker built with Next.js App Router.

## Setup Guide

1. Install dependencies.

```bash
npm install
```

2. Create or update `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
SERPAPI_KEY=your_serpapi_key
```

3. Start the development server.

```bash
npm run dev
```

4. Open `http://localhost:3000` and go to `Dashboard -> Grammar Checker` or `Dashboard -> Plagiarism Checker`.

## Plagiarism Checker

The plagiarism checker is available at `/dashboard/plagiarism`.

### What it does

- Accepts long-form text without a strict word limit.
- Preprocesses the content before any match lookup.
- Uses `compromise`, `natural`, and `stopword` together to normalize language, tokenize text, and filter common words.
- Splits the text into sentences and scores each sentence by uniqueness.
- Ignores generic sentences with weak lexical signals.
- Checks only the top 3 most distinctive fragments.
- Returns matched source titles, links, snippets, highlighted suspicious text, and a simple risk summary.
- Uses collapsible result cards so long texts stay readable.

### Main Flow

- `preprocessText()`: normalizes spacing and punctuation.
- `splitIntoSentences()`: breaks the document into sentence fragments with index ranges.
- `removeStopwords()`: filters common words using `compromise`, `natural`, and `stopword`.
- `scoreSentenceUniqueness()`: ranks fragments by rarity, lexical density, and specificity.
- `selectTopSentences()`: keeps only up to 3 search-worthy fragments.
- `searchWithSerpAPI()`: fetches candidate source results for the selected fragments.
- `analyzeMatches()`: scores overlap between search results and the candidate fragment.
- `renderResults()`: displays the collapsible UI result cards and highlights.

## Project Structure

```text
src/
  app/
    (main)/dashboard/
      grammar/page.tsx
      plagiarism/page.tsx
    api/
      grammar-check/route.ts
      plagiarism-check/route.ts
  lib/
    plagiarism.ts
  types/
    stopword.d.ts
```

## Sample Output Layout

```text
Plagiarism Checker
+------------------------------------------------------------+
| Text for Analysis                                          |
| [ large textarea ]                                         |
|                                     [ Analyze Plagiarism ] |
+------------------------------------------------------------+

Overall Plagiarism Risk: Medium
Score: 67% | Queries: 3 | Matches: 2

Matched / Suspected Text Highlights
- "... highlighted sentence from the original text ..."

Checked Fragments
- Fragment 1 [collapsed]
  Status: Match found
  Checked fragment: "adaptive reinforcement scheduling..."
  Suspected text: "The adaptive reinforcement scheduling..."

Matched Sources
- Fragment 1 [expanded]
  Match found
  Source 1 [collapsed]
  Title: Adaptive Reinforcement in Learning Systems
  Link: https://example.com/article
  Preview: "... reinforcement scheduling improved ..."
  Matched text highlight: "... reinforcement scheduling ..."
```

## Notes

- The server expects `SERPAPI_KEY` in `.env.local`.
- The plagiarism checker intentionally avoids sending the entire document to search services.
- Matching is heuristic-based and should be reviewed by a human before making academic decisions.
