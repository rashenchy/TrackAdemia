'use client'

// @refresh reset

/* =========================================
   IMPORTS
   - Recharts components for charts
   - Icons for UI
   - Types for props
========================================= */
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import {
  BarChart3,
  Users,
  BookOpen,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'

import type {
  AnalyticsMetrics,
  ResearchByProgram,
  ResearchTypeDistribution,
  TopResearch,
} from './types'

/* =========================================
   CONSTANTS
   - COLORS: used for pie chart slices
   - MIN_LABEL_PERCENT: threshold to show labels
========================================= */
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const MIN_LABEL_PERCENT = 0.08

/* =========================================
   PROPS INTERFACE
   Defines expected data passed into component
========================================= */
interface AdminDashboardClientProps {
  metrics: AnalyticsMetrics
  programData: ResearchByProgram[]
  typeData: ResearchTypeDistribution[]
  topResearch: TopResearch[]
  error?: string | null
}

/* =========================================
   MAIN COMPONENT
========================================= */
export default function AdminDashboardClient({
  metrics,
  programData,
  typeData,
  topResearch,
  error,
}: AdminDashboardClientProps) {

  /* =========================================
     FILTER PIE DATA
     Remove items with zero count
  ========================================= */
  const pieChartData = typeData.filter((item) => item.count > 0)

  /* =========================================
     ERROR DISPLAY
     Show error message if present
  ========================================= */
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 flex items-center gap-3">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl space-y-8 pb-8">

      {/* =========================================
         HEADER SECTION
      ========================================= */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
          <BarChart3 size={28} />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Analytics & Reporting
          </h1>

          <p className="text-gray-600 dark:text-gray-400">
            System-wide statistics, views, and downloads
          </p>
        </div>
      </div>

      {/* =========================================
         METRIC CARDS
      ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ===== TOTAL USERS ===== */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-blue-200 dark:bg-blue-900/40 rounded-lg">
              <Users size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Users
          </p>

          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalUsers}
          </p>
        </div>

        {/* ===== PENDING FACULTY ===== */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-yellow-200 dark:bg-yellow-900/40 rounded-lg">
              <AlertCircle size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Pending Faculty
          </p>

          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.pendingFaculty}
          </p>
        </div>

        {/* ===== PUBLISHED PAPERS ===== */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-green-200 dark:bg-green-900/40 rounded-lg">
              <BookOpen size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Published Papers
          </p>

          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalPublishedPapers}
          </p>
        </div>

        {/* ===== PENDING PAPERS ===== */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-orange-200 dark:bg-orange-900/40 rounded-lg">
              <TrendingUp size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Pending Papers
          </p>

          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalPendingPapers}
          </p>
        </div>
      </div>

      {/* =========================================
         CHART SECTION
      ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ===== BAR CHART ===== */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Research by Program
          </h2>

          {programData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={programData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis
                  dataKey="program"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />

                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />

                <Tooltip />

                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No data available
            </p>
          )}
        </div>

        {/* ===== PIE CHART ===== */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Research Types Distribution
          </h2>

          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="count"
                  outerRadius={80}
                  labelLine={false}
                  label={(props) => {
                    const percent = props.percent ?? 0

                    if (percent < MIN_LABEL_PERCENT) {
                      return null
                    }

                    return `${props.payload?.type}: ${(percent * 100).toFixed(0)}%`
                  }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No data available
            </p>
          )}
        </div>
      </div>

      {/* =========================================
         TABLE SECTION
      ========================================= */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Most Viewed Research
        </h2>

        {topResearch.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">

              {/* TABLE HEADER */}
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Author</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">Views</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">Downloads</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody>
                {topResearch.map((item, index) => (
                  <tr key={item.id} className="border-b">

                    {/* Rank */}
                    <td className="px-4 py-3 text-sm">#{index + 1}</td>

                    {/* Title */}
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.title}
                    </td>

                    {/* Author */}
                    <td className="px-4 py-3 text-sm">
                      {item.author_name}
                    </td>

                    {/* Views */}
                    <td className="px-4 py-3 text-sm text-center">
                      {item.views_count}
                    </td>

                    {/* Downloads */}
                    <td className="px-4 py-3 text-sm text-center">
                      {item.downloads_count}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No research data available
          </p>
        )}
      </div>

    </div>
  )
}