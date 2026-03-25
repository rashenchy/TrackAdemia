'use client'

import { useState } from 'react'
import { Eye, BookOpen, Users, BarChart3, GraduationCap, Loader2 } from 'lucide-react'
import { getDashboardStats, getFeaturedResearch } from './actions'

interface DashboardStats {
  totalResearch: number
  publishedResearch: number
  totalSections: number
  totalUsers: number
  totalMentors: number
}

interface FeaturedResearchItem {
  id: string
  title: string
  views_count: number
  downloads_count: number
  status: string
}

interface ViewAsUserClientProps {
  initialStats: DashboardStats
  initialFeatured: FeaturedResearchItem[]
}

export default function ViewAsUserClient({
  initialStats,
  initialFeatured,
}: ViewAsUserClientProps) {
  const [stats, setStats] = useState(initialStats)
  const [featured, setFeatured] = useState(initialFeatured)
  const [loading, setLoading] = useState(false)

  const refreshData = async () => {
    setLoading(true)
    const [statsData, featuredData] = await Promise.all([
      getDashboardStats(),
      getFeaturedResearch(),
    ])
    setStats(statsData)
    setFeatured(featuredData)
    setLoading(false)
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-3">
        <Eye size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">Admin Viewing Mode</p>
          <p className="text-xs text-purple-800 dark:text-purple-400 mt-0.5">
            You&apos;re viewing the system from a regular user&apos;s perspective.
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flex items-start gap-4 mb-8">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
          <BookOpen size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">System Overview</h1>
          <p className="text-gray-600 dark:text-gray-400">Aggregate statistics of the TrackAdemia research platform</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-start justify-between mb-4"><div className="p-2 bg-blue-200 dark:bg-blue-900/40 rounded-lg"><Users size={24} className="text-blue-600 dark:text-blue-400" /></div></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-6">
              <div className="flex items-start justify-between mb-4"><div className="p-2 bg-green-200 dark:bg-green-900/40 rounded-lg"><GraduationCap size={24} className="text-green-600 dark:text-green-400" /></div></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Mentors/Teachers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalMentors}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
              <div className="flex items-start justify-between mb-4"><div className="p-2 bg-purple-200 dark:bg-purple-900/40 rounded-lg"><BookOpen size={24} className="text-purple-600 dark:text-purple-400" /></div></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Research</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalResearch}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-6">
              <div className="flex items-start justify-between mb-4"><div className="p-2 bg-orange-200 dark:bg-orange-900/40 rounded-lg"><BarChart3 size={24} className="text-orange-600 dark:text-orange-400" /></div></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Published Research</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.publishedResearch}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6">
              <div className="flex items-start justify-between mb-4"><div className="p-2 bg-indigo-200 dark:bg-indigo-900/40 rounded-lg"><Users size={24} className="text-indigo-600 dark:text-indigo-400" /></div></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Active Sections</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalSections}</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Most Viewed Research</h2>
            <div className="space-y-3">
              {featured.length > 0 ? (
                featured.map((item, index) => (
                  <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">#{index + 1}</span>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{item.views_count} views</span>
                          <span>{item.downloads_count} downloads</span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">{item.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No research available yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
