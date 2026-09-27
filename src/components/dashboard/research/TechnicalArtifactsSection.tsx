'use client'

import { useState } from 'react'
import {
  Code2,
  GitBranch,
  Globe,
  FileArchive,
  Layers,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileCode,
  Info,
} from 'lucide-react'
import {
  DIAGRAM_TYPE_OPTIONS,
  type ResearchDiagramItem,
  type ResearchDiagramType,
  getDiagramTypeShortLabel,
} from '@/lib/research/diagrams/types'

export type ClientNewDiagramDraft = {
  tempId: string
  file: File | null
  previewUrl: string | null
  diagramType: ResearchDiagramType
  title: string
}

interface TechnicalArtifactsSectionProps {
  initialRepositoryUrl?: string | null
  initialDemoUrl?: string | null
  initialSourceCodeUrl?: string | null
  initialSourceCodeFilename?: string | null
  initialDiagrams?: ResearchDiagramItem[] | null
  isCaseStudyOrCapstone?: boolean
}

function generateClientTempId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `diagram_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function TechnicalArtifactsSection({
  initialRepositoryUrl = '',
  initialDemoUrl = '',
  initialSourceCodeUrl = null,
  initialSourceCodeFilename = null,
  initialDiagrams = [],
  isCaseStudyOrCapstone = true,
}: TechnicalArtifactsSectionProps) {
  const [repositoryUrl, setRepositoryUrl] = useState(initialRepositoryUrl || '')
  const [demoUrl, setDemoUrl] = useState(initialDemoUrl || '')
  const [existingSourceCodeUrl, setExistingSourceCodeUrl] = useState<string | null>(
    initialSourceCodeUrl
  )
  const [existingSourceCodeFilename, setExistingSourceCodeFilename] = useState<string | null>(
    initialSourceCodeFilename
  )
  const [removeExistingZip, setRemoveExistingZip] = useState(false)

  // Diagrams state: preserved existing diagrams + newly staged diagram uploads
  const [existingDiagrams, setExistingDiagrams] = useState<ResearchDiagramItem[]>(
    initialDiagrams || []
  )
  const [newDiagrams, setNewDiagrams] = useState<ClientNewDiagramDraft[]>([])

  const handleAddNewDiagramSlot = () => {
    setNewDiagrams((prev) => [
      ...prev,
      {
        tempId: generateClientTempId(),
        file: null,
        previewUrl: null,
        diagramType: 'erd',
        title: '',
      },
    ])
  }

  const handleRemoveNewDiagram = (tempId: string) => {
    setNewDiagrams((prev) => {
      const target = prev.find((d) => d.tempId === tempId)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((d) => d.tempId !== tempId)
    })
  }

  const handleDiagramFileChange = (tempId: string, file: File | null) => {
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    const suggestedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')

    setNewDiagrams((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
        return {
          ...item,
          file,
          previewUrl,
          title: item.title || suggestedTitle,
        }
      })
    )
  }

  const handleDiagramTypeChange = (tempId: string, diagramType: ResearchDiagramType) => {
    setNewDiagrams((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, diagramType } : item))
    )
  }

  const handleDiagramTitleChange = (tempId: string, title: string) => {
    setNewDiagrams((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, title } : item))
    )
  }

  const handleRemoveExistingDiagram = (diagramId: string) => {
    setExistingDiagrams((prev) => prev.filter((d) => d.id !== diagramId))
  }

  return (
    <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Code2 className="text-blue-600" size={20} />
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              Technical Deliverables &amp; Artifacts
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Case Study &amp; Capstone
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Attach GitHub repositories, project archives, and technical diagrams (ERD, DFD, Architecture). Optional for theoretical papers.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden inputs to preserve existing assets */}
      <input
        type="hidden"
        name="existingDiagramsJson"
        value={JSON.stringify(existingDiagrams)}
      />
      <input
        type="hidden"
        name="existingSourceCodeUrl"
        value={removeExistingZip ? '' : existingSourceCodeUrl || ''}
      />
      <input
        type="hidden"
        name="existingSourceCodeFilename"
        value={removeExistingZip ? '' : existingSourceCodeFilename || ''}
      />

      {/* Source Code & Demo URLs */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
            <GitBranch size={15} className="text-gray-500" />
            Repository URL
          </label>
          <input
            type="url"
            name="repositoryUrl"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/organization/project-name"
            className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-sm text-[var(--foreground)] outline-none focus:border-blue-600 transition-all"
          />
          <p className="text-[11px] text-gray-500">
            Public or accessible link to GitHub, GitLab, or Bitbucket.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
            <Globe size={15} className="text-gray-500" />
            Live Prototype / Demo URL
          </label>
          <input
            type="url"
            name="demoUrl"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://your-system.vercel.app"
            className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-sm text-[var(--foreground)] outline-none focus:border-blue-600 transition-all"
          />
          <p className="text-[11px] text-gray-500">
            Deployed web app, cloud endpoint, or interactive prototype.
          </p>
        </div>
      </div>

      {/* Project Source Code Archive (.ZIP) */}
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/20 space-y-3">
        <div className="flex items-center gap-2">
          <FileArchive className="text-amber-600" size={18} />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Source Code Archive (.ZIP)
          </span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Optional
          </span>
        </div>

        {existingSourceCodeUrl && !removeExistingZip ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-center gap-2.5">
              <FileCode className="text-amber-600" size={20} />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {existingSourceCodeFilename || 'source-code.zip'}
                </p>
                <p className="text-[11px] text-green-600 dark:text-green-400">
                  Archive already attached
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRemoveExistingZip(true)}
              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded transition-colors"
            >
              Replace or Remove
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input
              type="file"
              name="sourceCodeZip"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900/30 dark:file:text-amber-300 transition-all cursor-pointer border border-gray-300 dark:border-gray-700 rounded-lg"
            />
            <p className="text-[11px] text-gray-500">
              Upload full source code package as a .zip file (up to 50MB). Avoid bundling large dependencies like node_modules.
            </p>
          </div>
        )}
      </div>

      {/* Technical Diagrams Section */}
      <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={18} />
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                System Diagrams (DFD, ERD, Architecture, Mockups)
              </h3>
              <p className="text-xs text-gray-500">
                Add technical diagram images with labels and captions so teachers can inspect and grade system design.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddNewDiagramSlot}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Add Diagram
          </button>
        </div>

        {/* List of existing preserved diagrams */}
        {existingDiagrams.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Existing Attached Diagrams ({existingDiagrams.length})
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {existingDiagrams.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ImageIcon className="text-blue-600 shrink-0" size={18} />
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 mr-2">
                        {getDiagramTypeShortLabel(d.diagram_type)}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {d.title || 'Technical Diagram'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingDiagram(d.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Remove diagram"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List of new diagram upload rows */}
        {newDiagrams.length > 0 && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              New Diagrams to Upload ({newDiagrams.length})
            </span>

            {newDiagrams.map((draft, idx) => (
              <div
                key={draft.tempId}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20"
              >
                {/* Image preview or icon */}
                <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                  {draft.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.previewUrl}
                      alt="Preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="text-gray-400" size={24} />
                  )}
                </div>

                {/* File input */}
                <div className="w-full sm:w-48 shrink-0">
                  <input
                    type="file"
                    name={`diagram_file_${idx}`}
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    required={!draft.file}
                    onChange={(e) =>
                      handleDiagramFileChange(draft.tempId, e.target.files?.[0] || null)
                    }
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
                  />
                </div>

                {/* Diagram type select */}
                <div className="w-full sm:w-44 shrink-0">
                  <select
                    name={`diagram_type_${idx}`}
                    value={draft.diagramType}
                    onChange={(e) =>
                      handleDiagramTypeChange(
                        draft.tempId,
                        e.target.value as ResearchDiagramType
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2 text-xs bg-white dark:bg-gray-800 text-[var(--foreground)] outline-none focus:border-blue-600 transition-all"
                  >
                    {DIAGRAM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caption / Title input */}
                <div className="flex-1 w-full min-w-0">
                  <input
                    type="text"
                    name={`diagram_title_${idx}`}
                    value={draft.title}
                    onChange={(e) => handleDiagramTitleChange(draft.tempId, e.target.value)}
                    placeholder="Figure caption (e.g. Figure 1: ERD with Normalized Tables)"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2 text-xs bg-white dark:bg-gray-800 text-[var(--foreground)] outline-none focus:border-blue-600 transition-all"
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveNewDiagram(draft.tempId)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {existingDiagrams.length === 0 && newDiagrams.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 p-4 text-center">
            <p className="text-xs text-gray-400">
              No technical diagrams attached yet. Click &quot;Add Diagram&quot; to upload your ERD, DFD, or architecture models.
            </p>
          </div>
        )}

        <input type="hidden" name="diagramCount" value={newDiagrams.length} />
      </div>
    </div>
  )
}
