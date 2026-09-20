export type ResearchDiagramType =
  | 'erd'
  | 'dfd_context'
  | 'dfd_level_0'
  | 'dfd_level_1'
  | 'architecture'
  | 'use_case'
  | 'ui_mockup'
  | 'other'

export type ResearchDiagramItem = {
  id: string
  file_url: string
  title: string
  diagram_type: ResearchDiagramType
  original_file_name?: string
  created_at?: string
}

export const DIAGRAM_TYPE_OPTIONS: {
  value: ResearchDiagramType
  label: string
  shortLabel: string
  description: string
}[] = [
  {
    value: 'erd',
    label: 'Entity Relationship Diagram (ERD)',
    shortLabel: 'ERD',
    description: 'Data model schema, table entities, relationships, and foreign keys',
  },
  {
    value: 'dfd_context',
    label: 'Context Diagram (DFD Level 0)',
    shortLabel: 'DFD Context',
    description: 'High-level system boundary and external entities',
  },
  {
    value: 'dfd_level_0',
    label: 'Data Flow Diagram (Level 0)',
    shortLabel: 'DFD Level 0',
    description: 'Major processes, data stores, and data flows',
  },
  {
    value: 'dfd_level_1',
    label: 'Data Flow Diagram (Level 1+)',
    shortLabel: 'DFD Level 1',
    description: 'Sub-process decompositions and detailed operational flows',
  },
  {
    value: 'architecture',
    label: 'System Architecture & Topology',
    shortLabel: 'Architecture',
    description: 'Client-server structure, cloud infrastructure, and network layout',
  },
  {
    value: 'use_case',
    label: 'Use Case Diagram',
    shortLabel: 'Use Case',
    description: 'Actors, system actions, and user interaction scenarios',
  },
  {
    value: 'ui_mockup',
    label: 'UI / UX Wireframe & Mockup',
    shortLabel: 'UI Mockup',
    description: 'User interface layout, application screens, and navigation flow',
  },
  {
    value: 'other',
    label: 'Other Technical Diagram',
    shortLabel: 'Technical Diagram',
    description: 'Flowchart, sequence diagram, or general technical specification',
  },
]

export function getDiagramTypeLabel(type: ResearchDiagramType | string): string {
  const found = DIAGRAM_TYPE_OPTIONS.find((opt) => opt.value === type)
  return found?.label || 'Technical Diagram'
}

export function getDiagramTypeShortLabel(type: ResearchDiagramType | string): string {
  const found = DIAGRAM_TYPE_OPTIONS.find((opt) => opt.value === type)
  return found?.shortLabel || 'Diagram'
}

export function getDiagramTypeBadgeStyle(type: ResearchDiagramType | string): string {
  switch (type) {
    case 'erd':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'dfd_context':
    case 'dfd_level_0':
    case 'dfd_level_1':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'architecture':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    case 'use_case':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    case 'ui_mockup':
      return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
}
