import { ResearchDocumentStructureEditor } from '@/components/dashboard/research/ResearchDocumentStructureEditor'
import type { ResearchDocumentContent } from '@/lib/research/document'

export function ResearchDocumentSections({
  content,
}: {
  content: ResearchDocumentContent
}) {
  return <ResearchDocumentStructureEditor value={content} editable={false} />
}
