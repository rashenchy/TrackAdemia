import {
  getResearchEditorSectionsForStage,
  normalizeRichTextEditorValue,
  type ResearchDocumentContent,
} from '@/lib/research/document'

export function ResearchDocumentSections({
  content,
  stage,
}: {
  content: ResearchDocumentContent
  stage: string | null | undefined
}) {
  const visibleSections = getResearchEditorSectionsForStage(stage)

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => (
        <section
          key={section.key}
          className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20"
        >
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            {section.label}
          </h3>
          {content[section.key] ? (
            <div
              className="trackademia-editor mt-3 text-sm leading-7 text-[var(--foreground)]"
              dangerouslySetInnerHTML={{
                __html: normalizeRichTextEditorValue(content[section.key]),
              }}
            />
          ) : (
            <div className="mt-3 text-sm leading-7 text-[var(--foreground)]">
              No content provided for this section.
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
