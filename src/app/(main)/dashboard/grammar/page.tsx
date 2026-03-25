'use client';

import { useState } from 'react';
import { Sparkles, AlertCircle, Loader2, CheckCircle2, Type } from 'lucide-react';

interface Correction {
  original_sentence: string;
  corrected_sentence: string;
  explanation: string;
}

export default function GrammarCheckerPage() {
  const [inputText, setInputText] = useState('');
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckGrammar = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to check.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCorrections([]);

    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check grammar.');
      }

      setCorrections(data.corrections || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
          <Sparkles className="text-blue-600" size={32} />
          Grammar Checker
        </h1>
        <p className="text-gray-500 mt-1">
          Instantly detect and correct grammar mistakes with AI.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* INPUT SECTION */}
        <div className="bg-[var(--background)] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full">

          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
            <Type className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Original Text
            </h2>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste or type your draft here..."
            className="flex-1 min-h-[300px] w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 p-4 bg-transparent text-[var(--foreground)] focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all leading-relaxed"
          />

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleCheckGrammar}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Check Grammar
                </>
              )}
            </button>
          </div>
        </div>

        {/* RESULTS SECTION */}
        <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full min-h-[400px]">

          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <Sparkles className="text-green-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Grammar Suggestions
            </h2>
          </div>

          {/* ERROR STATE */}
          {error && (
            <div className="flex items-start gap-3 p-4 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* LOADING STATE */}
          {isLoading && corrections.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-sm font-medium animate-pulse">
                Reviewing text and generating feedback...
              </p>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && corrections.length === 0 && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Type size={40} className="opacity-20" />
              <p className="text-sm">
                Your grammar suggestions will appear here.
              </p>
            </div>
          )}

          {/* RESULTS */}
          {!isLoading && corrections.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">

              {corrections.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <p className="text-sm text-red-500 font-semibold">
                    Original
                  </p>
                  <p className="mb-2">{item.original_sentence}</p>

                  <p className="text-sm text-green-500 font-semibold">
                    Corrected
                  </p>
                  <p className="mb-2">{item.corrected_sentence}</p>

                  <p className="text-sm text-blue-500 font-semibold">
                    Explanation
                  </p>
                  <p>{item.explanation}</p>
                </div>
              ))}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}