'use client'

import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Database,
  Download,
  FileBarChart,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  exportMonitoringData,
  getMonitoringDashboardData,
  type MonitoringDashboardData,
} from './actions'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface APIMonitoringClientProps {
  initialData: MonitoringDashboardData
}

function ProviderIcon({ provider }: { provider: 'gemini' | 'groq' | 'serpapi' | 'supabase' }) {
  if (provider === 'gemini' || provider === 'groq') {
    return <Sparkles size={22} className="text-indigo-600 dark:text-indigo-400" />
  }

  if (provider === 'serpapi') {
    return <Search size={22} className="text-amber-600 dark:text-amber-400" />
  }

  return <Database size={22} className="text-emerald-600 dark:text-emerald-400" />
}

function formatLastActivity(value: string | null) {
  if (!value) return 'No activity yet'
  return new Date(value).toLocaleString()
}

function formatProviderLabel(provider: 'gemini' | 'groq' | 'serpapi' | 'supabase') {
  if (provider === 'gemini') return 'Gemini'
  if (provider === 'groq') return 'Groq'
  if (provider === 'serpapi') return 'SerpAPI'
  return 'Supabase'
}

export default function APIMonitoringClient({
  initialData,
}: APIMonitoringClientProps) {
  const [data, setData] = useState<MonitoringDashboardData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [startDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate] = useState(new Date().toISOString().split('T')[0])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const dashboardData = await getMonitoringDashboardData()
      setData(dashboardData)
    } catch (err) {
      setError('Failed to load API monitoring data.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)

    try {
      const csv = await exportMonitoringData(startDate, endDate)
      if (!csv) {
        setError('No monitoring data available to export.')
        return
      }

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `api-monitoring-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setSuccessMessage('Monitoring export downloaded successfully.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to export monitoring data.')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const groqMetrics = data.providerMetrics.find(
    (item) => item.provider === 'groq'
  )
  const serpapiMetrics = data.providerMetrics.find(
    (item) => item.provider === 'serpapi'
  )

  const overviewCards = [
    {
      label: 'Supabase Users',
      value: data.supabaseMetrics.totalUsers.toLocaleString(),
      tone: 'from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/10 dark:border-emerald-800',
      icon: 'supabase' as const,
    },
    {
      label: 'Groq Requests',
      value: (groqMetrics?.totalRequests || 0).toLocaleString(),
      tone: 'from-indigo-50 to-indigo-100 border-indigo-200 dark:from-indigo-900/20 dark:to-indigo-900/10 dark:border-indigo-800',
      icon: 'groq' as const,
    },
    {
      label: 'SerpAPI Requests',
      value: (serpapiMetrics?.totalRequests || 0).toLocaleString(),
      tone: 'from-amber-50 to-amber-100 border-amber-200 dark:from-amber-900/20 dark:to-amber-900/10 dark:border-amber-800',
      icon: 'serpapi' as const,
    },
    {
      label: 'Published Research',
      value: data.supabaseMetrics.publishedResearch.toLocaleString(),
      tone: 'from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800',
      icon: 'supabase' as const,
    },
  ]

  return (
    <div className="max-w-7xl space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              API Monitoring
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor Supabase platform activity and app-level Groq and
              SerpAPI usage from one admin dashboard.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            Refresh
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            Export Logs
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-gradient-to-br p-6 ${card.tone}`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-white/70 p-2 dark:bg-black/20">
                <ProviderIcon provider={card.icon} />
              </div>
            </div>
            <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              {card.label}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <FileBarChart size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Daily Provider Activity
            </h2>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="groq"
                stroke="#6366f1"
                strokeWidth={2.5}
                name="Groq"
              />
              <Line
                type="monotone"
                dataKey="serpapi"
                stroke="#f59e0b"
                strokeWidth={2.5}
                name="SerpAPI"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <Database size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Supabase Metrics
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['Users', data.supabaseMetrics.totalUsers],
              ['Mentors', data.supabaseMetrics.totalMentors],
              ['Students', data.supabaseMetrics.totalStudents],
              ['Research', data.supabaseMetrics.totalResearch],
              ['Sections', data.supabaseMetrics.totalSections],
              ['Active Members', data.supabaseMetrics.activeSectionMembers],
              ['Annotations', data.supabaseMetrics.totalAnnotations],
              ['Unresolved Notes', data.supabaseMetrics.unresolvedAnnotations],
              ['Tasks', data.supabaseMetrics.totalTasks],
              ['Open Tasks', data.supabaseMetrics.unresolvedTasks],
              ['Views', data.supabaseMetrics.totalViews],
              ['Downloads', data.supabaseMetrics.totalDownloads],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.providerMetrics.map((provider) => (
          <div
            key={provider.provider}
            className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <ProviderIcon provider={provider.provider} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {provider.label}
                </h2>
                <p className="text-sm text-gray-500">
                  Last activity: {provider.provider === 'groq'
                    ? formatLastActivity(groqMetrics?.lastActivity || null)
                    : formatLastActivity(serpapiMetrics?.lastActivity || null)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ['Requests', provider.totalRequests],
                ['Success Rate', `${provider.successRate}%`],
                ['Success', provider.successfulRequests],
                ['Failed', provider.failedRequests],
                ['Validation Errors', provider.validationErrors],
                ['Avg Response', `${provider.averageResponseTime} ms`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {provider.extraMetrics.length > 0 && (
              <div className="mt-4 grid gap-3">
                {provider.extraMetrics.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/40"
                  >
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">
          Recent API Activity
        </h2>

        {data.recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                    API
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                    User
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Time
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Input
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Output
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-200 dark:border-gray-800 ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatProviderLabel(log.provider)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {log.api_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {log.user_name}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : log.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {log.response_time_ms} ms
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {log.input_units}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {log.output_units}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="font-medium text-gray-600 dark:text-gray-400">
              No API monitoring data available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
