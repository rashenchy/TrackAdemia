export interface AnalyticsMetrics {
  totalUsers: number
  pendingFaculty: number
  totalPublishedPapers: number
  totalPendingPapers: number
}

export interface ResearchByProgram {
  program: string
  count: number
}

export interface ResearchTypeDistribution {
  type: string
  count: number
  percentage: number
}

export interface TopResearch {
  id: string
  title: string
  author_name: string
  views_count: number
  downloads_count: number
  total_engagement: number
}
