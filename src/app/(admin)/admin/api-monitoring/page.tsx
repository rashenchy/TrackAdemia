import { requireAdminAccess } from '../lib/require-admin'
import { getGrammarCheckLogs, getGrammarMetrics } from './actions'
import APIMonitoringClient from './api-monitoring-client'

export default async function APIMonitoringPage() {
  await requireAdminAccess()

  const [initialMetrics, initialLogs] = await Promise.all([
    getGrammarMetrics(),
    getGrammarCheckLogs(),
  ])

  return (
    <APIMonitoringClient
      initialMetrics={initialMetrics}
      initialLogs={initialLogs}
    />
  )
}
