/* =========================================
   ANALYTICS METRICS
   Stores the main summary values shown
   in the analytics dashboard cards
========================================= */
export interface AnalyticsMetrics {
  totalUsers: number
  pendingFaculty: number
  totalPublishedPapers: number
  totalPendingPapers: number
}

/* =========================================
   RESEARCH BY PROGRAM
   Represents the number of research
   records under each academic program
========================================= */
export interface ResearchByProgram {
  program: string
  count: number
}

/* =========================================
   RESEARCH TYPE DISTRIBUTION
   Represents how many research records
   belong to each type and its percentage
========================================= */
export interface ResearchTypeDistribution {
  type: string
  count: number
  percentage: number
}

/* =========================================
   TOP RESEARCH
   Represents a research item with its
   title, author, views, and downloads
========================================= */
export interface TopResearch {
  id: string
  title: string
  author_name: string
  views_count: number
  downloads_count: number
}