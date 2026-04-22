'use client'

import { CheckCircle2, MessageSquare, Plus, Trash2, Library, LayoutTemplate, ScrollText } from 'lucide-react'
import { ResearchChapterSectionsEditor } from '@/components/dashboard/research/ResearchChapterSectionsEditor'
import { ResearchRichTextEditor } from '@/components/dashboard/research/ResearchRichTextEditor'
import {
  canSwitchResearchDocumentEditorMode,
  createBibliographySection,
  createSingleDocumentContent,
  createResearchDocumentSection,
  getResearchDocumentEditorMode,
  type ResearchDocumentContent,
  type ResearchDocumentSection,
} from '@/lib/research/document'

function buildSectionSummary(sectionCount: number) {
  return `${sectionCount} chapter${sectionCount === 1 ? '' : 's'}`
}

type SectionFeedbackItem = {
  id: string
  commentText: string
  isResolved: boolean
}

export function ResearchDocumentStructureEditor({
  inputName,
  value,
  onChange,
  editable = true,
  onSectionMouseUp,
  onSectionRef,
  sectionFeedback = {},
  activeFeedbackId = null,
  onFeedbackSelect,
}: {
  inputName?: string
  value: ResearchDocumentContent
  onChange?: (value: ResearchDocumentContent) => void
  editable?: boolean
  onSectionMouseUp?: (sectionId: string) => void
  onSectionRef?: (sectionId: string, node: HTMLElement | null) => void
  sectionFeedback?: Record<string, SectionFeedbackItem[]>
  activeFeedbackId?: string | null
  onFeedbackSelect?: (annotationId: string) => void
}) {
  const editorMode = getResearchDocumentEditorMode(value)
  const canSwitchMode = canSwitchResearchDocumentEditorMode(value)
  const documentSections = value.sections

  const commitSections = (nextSections: ResearchDocumentSection[]) => {
    onChange?.({ ...value, editorMode, sections: nextSections })
  }

  const addChapter = () => {
    commitSections([
      ...documentSections,
      createResearchDocumentSection(
        `CHAPTER ${documentSections.length + 1}`,
        '<p></p>',
        'rich-text'
      ),
    ])
  }

  const addBibliography = () => {
    if (documentSections.some((section) => section.kind === 'rich-text')) {
      return
    }

    commitSections([...documentSections, createBibliographySection()])
  }

  const updateSection = (sectionId: string, updates: Partial<ResearchDocumentSection>) => {
    commitSections(
      documentSections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    )
  }

  const switchEditorMode = (nextMode: 'chapters' | 'single') => {
    if (!onChange || nextMode === editorMode || !canSwitchMode) {
      return
    }

    if (nextMode === 'single') {
      onChange(createSingleDocumentContent())
      return
    }

    onChange({
      editorMode: 'chapters',
      sections: [
        createResearchDocumentSection('CHAPTER 1', '<p></p>', 'rich-text', 'template-1'),
      ],
    })
  }

  const removeSection = (sectionId: string) => {
    commitSections(documentSections.filter((section) => section.id !== sectionId))
  }

  const renderSectionFeedback = (sectionId: string) => {
    const feedbackItems = sectionFeedback[sectionId] || []

    if (feedbackItems.length === 0) {
      return null
    }

    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
            <MessageSquare size={14} />
            Section Feedback
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-800">
            {feedbackItems.length} item{feedbackItems.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {feedbackItems.map((item, index) => {
            const isActive = item.id === activeFeedbackId

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFeedbackSelect?.(item.id)}
                className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : item.isResolved
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100/70'
                }`}
              >
                {item.isResolved ? <CheckCircle2 size={13} /> : <MessageSquare size={13} />}
                <span className="truncate">
                  {index + 1}. {item.commentText}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (!editable) {
    return (
      <div className="space-y-4">
      {documentSections.length > 0 ? (
        documentSections.map((section) => (
            <section
              key={section.id}
              ref={(node) => onSectionRef?.(section.id, node)}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20"
              onMouseUp={() => onSectionMouseUp?.(section.id)}
            >
              <span data-document-section-title="true" className="sr-only">
                {section.title}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                {section.title}
              </h3>
              <div className="mt-3">{renderSectionFeedback(section.id)}</div>
              {section.kind === 'structured' ? (
                <div className="mt-3">
                  <ResearchChapterSectionsEditor
                    value={section.content}
                    onChange={() => {}}
                    placeholder={`Write the ${section.title.toLowerCase()} content`}
                    editable={false}
                    onMouseUp={() => onSectionMouseUp?.(section.id)}
                  />
                </div>
              ) : (
                <div className="mt-3">
                  <ResearchRichTextEditor
                    value={section.content}
                    onChange={() => {}}
                    placeholder={`Write the ${section.title.toLowerCase()} here...`}
                    editable={false}
                    onMouseUp={() => onSectionMouseUp?.(section.id)}
                  />
                </div>
              )}
            </section>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">
            No content provided for this manuscript.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {inputName ? (
        <input
          type="hidden"
          name={inputName}
          value={JSON.stringify(value)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
            Manuscript Workspace
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Choose how you want to write, then manage the manuscript at full chapter scale.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => switchEditorMode('single')}
              disabled={!canSwitchMode && editorMode !== 'single'}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                editorMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ScrollText size={14} />
              Single Document
            </button>
            <button
              type="button"
              onClick={() => switchEditorMode('chapters')}
              disabled={!canSwitchMode && editorMode !== 'chapters'}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                editorMode === 'chapters'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <LayoutTemplate size={14} />
              By Chapter
            </button>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
            {editorMode === 'single' ? '1 document' : buildSectionSummary(documentSections.length)}
          </span>
          {editorMode === 'chapters' ? (
            <button
              type="button"
              onClick={addChapter}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add Chapter
            </button>
          ) : null}
          <button
            type="button"
            onClick={addBibliography}
            disabled={documentSections.some((section) => section.kind === 'rich-text')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Library size={16} />
            Add Bibliography
          </button>
        </div>
      </div>

      {!canSwitchMode && editable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Existing subsection-based content is preserved as-is. The new editor mode switch only applies to new or empty manuscript content.
        </div>
      ) : null}

      {editorMode === 'single' ? (
        <section
          ref={(node) => onSectionRef?.(documentSections[0]?.id || 'document-body', node)}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <span data-document-section-title="true" className="sr-only">
            Document
          </span>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Full Document Editor
              </label>
              <p className="text-sm text-gray-600">
                Write the entire manuscript in one continuous WYSIWYG editor.
              </p>
            </div>
          </div>

          <ResearchRichTextEditor
            value={documentSections[0]?.content || '<p></p>'}
            onChange={(nextValue) =>
              onChange?.({
                editorMode: 'single',
                sections: [
                  createResearchDocumentSection(
                    'Document',
                    nextValue,
                    'rich-text',
                    documentSections[0]?.id || 'document-body'
                  ),
                ],
              })
            }
            placeholder="Write your manuscript here..."
            editable={editable}
            onMouseUp={() => onSectionMouseUp?.(documentSections[0]?.id || 'document-body')}
          />
        </section>
      ) : (
        <div className="space-y-5">
          {documentSections.map((section, index) => (
          <section
            key={section.id}
            ref={(node) => onSectionRef?.(section.id, node)}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              (sectionFeedback[section.id] || []).length > 0
                ? 'border-amber-200'
                : 'border-gray-200'
            }`}
          >
            <span data-document-section-title="true" className="sr-only">
              {section.title}
            </span>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Chapter Title
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
                onClick={() => removeSection(section.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>

            {renderSectionFeedback(section.id)}

            {section.kind === 'structured' ? (
              <ResearchChapterSectionsEditor
                value={section.content}
                onChange={(nextValue) => updateSection(section.id, { content: nextValue })}
                placeholder={`Write the ${section.title.toLowerCase()} content`}
                editable={editable}
                onMouseUp={() => onSectionMouseUp?.(section.id)}
              />
            ) : (
              <ResearchRichTextEditor
                value={section.content}
                onChange={(nextValue) => updateSection(section.id, { content: nextValue })}
                placeholder={`Write the ${section.title.toLowerCase()} here...`}
                editable={editable}
                onMouseUp={() => onSectionMouseUp?.(section.id)}
              />
            )}
          </section>
          ))}
        </div>
      )}
    </div>
  )
}
