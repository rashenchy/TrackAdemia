'use client'

import { useState } from 'react'
import {
  Activity,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react'
import {
  getGrammarCheckLogs,
  getGrammarMetrics,
  exportGrammarMetrics,
} from './actions'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { GrammarMetrics, GrammarCheckLog } from './actions'

interface APIMonitoringClientProps {
  initialMetrics: GrammarMetrics | null
  initialLogs: GrammarCheckLog[]
}

export default function APIMonitoringClient({
  initialMetrics,
  initialLogs,
}: APIMonitoringClientProps) {
  const [metrics, setMetrics] = useState<GrammarMetrics | null>(initialMetrics)
  const [logs, setLogs] = useState<GrammarCheckLog[]>(initialLogs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [startDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [endDate] = useState(new Date().toISOString().split('T')[0])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [metricsData, logsData] = await Promise.all([
        getGrammarMetrics(),
        getGrammarCheckLogs(),
      ])
      setMetrics(metricsData)
      setLogs(logsData)
    } catch (err) {
      setError('Failed to load monitoring data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = await exportGrammarMetrics(startDate, endDate)
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `grammar-monitoring-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setSuccessMessage('Export downloaded successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch {
      setError('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Grammar Checker Monitoring</h1>
            <p className="text-gray-600 dark:text-gray-400">Track grammar API usage, performance metrics, and system health</p>
          </div>
        </div>
        <button onClick={loadData} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          Refresh
        </button>
      </div>

      {successMessage && <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-300 flex items-center gap-3"><CheckCircle size={20} /><span className="font-medium">{successMessage}</span></div>}
      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 flex items-center gap-3"><AlertCircle size={20} /><span className="font-medium">{error}</span></div>}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-6"><div className="flex items-start justify-between mb-4"><div className="p-2 bg-blue-200 dark:bg-blue-900/40 rounded-lg"><Zap size={24} className="text-blue-600 dark:text-blue-400" /></div></div><p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Checks</p><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalChecks}</p></div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-6"><div className="flex items-start justify-between mb-4"><div className="p-2 bg-green-200 dark:bg-green-900/40 rounded-lg"><CheckCircle size={24} className="text-green-600 dark:text-green-400" /></div></div><p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Success Rate</p><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.successRate}%</p></div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-6"><div className="flex items-start justify-between mb-4"><div className="p-2 bg-purple-200 dark:bg-purple-900/40 rounded-lg"><Clock size={24} className="text-purple-600 dark:text-purple-400" /></div></div><p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Avg Time</p><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.averageProcessingTime}ms</p></div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-6"><div className="flex items-start justify-between mb-4"><div className="p-2 bg-orange-200 dark:bg-orange-900/40 rounded-lg"><TrendingUp size={24} className="text-orange-600 dark:text-orange-400" /></div></div><p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Characters</p><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{(metrics.totalCharactersChecked / 1000).toFixed(0)}K</p></div>
        </div>
      )}

      {metrics && metrics.dailyChecks.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Daily Check Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.dailyChecks}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Export
          </button>
        </div>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">User</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">Research</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">Status</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">Time (ms)</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">Characters</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">Issues</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">Date</th></tr></thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id} className={`border-b border-gray-200 dark:border-gray-800 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'}`}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{log.user_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{log.research_title}</td>
                    <td className="px-4 py-3 text-sm text-center"><span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${log.status === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : log.status === 'failed' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'}`}>{log.status}</span></td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">{log.processing_time_ms}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">{log.characters_checked}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400 font-medium">{log.issues_found}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(log.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8"><p className="text-gray-600 dark:text-gray-400 font-medium">No monitoring data available</p></div>
        )}
      </div>
    </div>
  )
}
