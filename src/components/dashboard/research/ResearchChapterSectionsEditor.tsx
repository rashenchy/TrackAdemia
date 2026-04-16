'use client'

import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ResearchRichTextEditor } from '@/components/dashboard/research/ResearchRichTextEditor'
import {
  createResearchChapterSection,
  parseResearchChapterSections,
  serializeResearchChapterSections,
  type ResearchChapterSection,
} from '@/lib/research/document'

function buildSectionSummary(sectionCount: number) {
  return `${sectionCount} section${sectionCount === 1 ? '' : 's'}`
}

function swallowPointerEvent(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
}

export function ResearchChapterSectionsEditor({
  inputName,
  value,
  onChange,
  placeholder,
  editable = true,
  fallbackTitles = ['Section 1'],
  onMouseUp,
}: {
  inputName?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  editable?: boolean
  fallbackTitles?: string[]
  onMouseUp?: () => void
}) {
  const chapterSections = useMemo(
    () => parseResearchChapterSections(value, fallbackTitles),
    [fallbackTitles, value]
  )

  const commitSections = (nextSections: ResearchChapterSection[]) => {
    const nextValue = serializeResearchChapterSections(nextSections)

    if (nextValue !== value) {
      onChange(nextValue)
    }
  }

  const addSection = () => {
    commitSections([...chapterSections, createResearchChapterSection('', '<p></p>')])
  }

  const updateSection = (
    sectionId: string,
    updates: Partial<ResearchChapterSection>
  ) => {
    commitSections(
      chapterSections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    )
  }

  const removeSection = (sectionId: string) => {
    commitSections(chapterSections.filter((section) => section.id !== sectionId))
  }

  const serializedValue = useMemo(
    () => serializeResearchChapterSections(chapterSections),
    [chapterSections]
  )

  if (!editable) {
    return (
      <div
        data-editor-content-root
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
        onMouseUp={onMouseUp}
      >
        {inputName ? <input type="hidden" name={inputName} value={serializedValue} /> : null}
        {chapterSections.length > 0 ? (
          chapterSections.map((section) => (
            <article
              key={section.id}
              className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-4"
            >
              <h4 className="text-base font-bold text-gray-900">{section.title}</h4>
              <div
                data-annotation-text-root="true"
                className="trackademia-editor mt-3 text-sm leading-7 text-[var(--foreground)]"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">
            No content provided for this chapter.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
      {inputName ? <input type="hidden" name={inputName} value={serializedValue} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
            Structured Chapter Editor
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Organize this chapter into smaller academic sections instead of one long block.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {buildSectionSummary(chapterSections.length)}
          </span>
          <button
            type="button"
            onMouseDown={swallowPointerEvent}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              addSection()
            }}
            className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            Add section
          </button>
        </div>
      </div>

      <div data-editor-content-root className="space-y-4" onMouseUp={onMouseUp}>
        {chapterSections.map((section, index) => (
          <article key={section.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Section Title
                </label>
                <input
                  value={section.title}
                  onChange={(event) =>
                    updateSection(section.id, { title: event.target.value })
                  }
                  placeholder={`Section ${index + 1} title`}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base font-bold text-gray-900 outline-none transition focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onMouseDown={swallowPointerEvent}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  removeSection(section.id)
                }}
                disabled={chapterSections.length === 1}
                className="relative z-10 inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">{section.title.trim() || `Section ${index + 1}`}</p>
              <p className="mt-1 text-xs text-gray-500">
                Titles are automatically formatted in bold and shown directly above the content.
              </p>
            </div>

            <div className="mt-4">
              <ResearchRichTextEditor
                value={section.content}
                onChange={(nextValue) => updateSection(section.id, { content: nextValue })}
                placeholder={`${placeholder} for ${section.title.trim() || `section ${index + 1}`}`}
                editable={editable}
                onMouseUp={onMouseUp}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
