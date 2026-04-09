import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GitCompareArrows } from 'lucide-react'
import { buildResearchVersionDiff } from '@/lib/research/version-diff'
import { getVersionLabel } from '@/lib/research/versioning'
import { BackButton } from '@/components/navigation/BackButton'
import { appendFromParam, buildPathWithSearch } from '@/lib/navigation'

type VersionRow = {
  id: string
  version_number: number
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
  created_by_role?: string | null
  change_summary?: string | null
  created_at: string
  content_json?: unknown
  original_file_name?: string | null
}

function renderDiffParts(parts: ReturnType<typeof buildResearchVersionDiff>[number]['parts']) {
  return parts.map((part, index) => {
    const className = part.added
      ? 'bg-green-100 text-green-900'
      : part.removed
        ? 'bg-red-100 text-red-800 line-through'
        : 'text-[var(--foreground)]'

    return (
      <span key={`${index}-${part.value.slice(0, 10)}`} className={className}>
        {part.value}
      </span>
    )
  })
}

export default async function CompareResearchVersionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ from?: string; base?: string; target?: string; changed?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) || {}
  const researchId = resolvedParams.id
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: research } = await supabase
    .from('research')
    .select('id, title, current_stage, user_id, members, content_json, created_at')
    .eq('id', researchId)
    .single()

  if (!research) {
    return <div className="p-8">Research not found.</div>
  }

  const isTeacher = profile?.role === 'mentor' || profile?.role === 'admin'
  const isAuthor =
    research.user_id === user.id ||
    (Array.isArray(research.members) && research.members.includes(user.id))

  if (!isTeacher && !isAuthor) {
    redirect('/dashboard')
  }

  const { data: versionsData } = await supabase
    .from('research_versions')
    .select('id, version_number, version_major, version_minor, version_label, created_by_role, change_summary, created_at, content_json, original_file_name')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })

  const versions: VersionRow[] =
    versionsData && versionsData.length > 0
      ? versionsData
      : [
          {
            id: 'legacy',
            version_number: 1,
            version_label: '1',
            created_by_role: 'student',
            created_at: research.created_at,
            content_json: research.content_json,
            original_file_name: null,
          },
        ]

  const toVersionNumber =
    Number(resolvedSearchParams.target) ||
    versions[0]?.version_number ||
    1
  const defaultFromVersion =
    versions.find((version) => version.version_number !== toVersionNumber)?.version_number ||
    toVersionNumber
  const fromVersionNumber =
    Number(resolvedSearchParams.base) ||
    defaultFromVersion

  const fromVersion =
    versions.find((version) => version.version_number === fromVersionNumber) || versions[0]
  const toVersion =
    versions.find((version) => version.version_number === toVersionNumber) || versions[0]

  const diffSections = buildResearchVersionDiff(
    fromVersion?.content_json,
    toVersion?.content_json,
    research.current_stage
  )
  const showOnlyChanged = resolvedSearchParams.changed === '1'
  const displayedSections = showOnlyChanged
    ? diffSections.filter((section) => section.changed)
    : diffSections

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <BackButton
          fallbackHref={`/dashboard/research/${researchId}`}
          className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare Versions</h1>
          <p className="text-gray-500 mt-1">{research.title}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <input type="hidden" name="changed" value={showOnlyChanged ? '1' : '0'} />
          <input type="hidden" name="from" value={resolvedSearchParams.from ?? ''} />
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">From Version</label>
            <select
              name="base"
              defaultValue={String(fromVersion.version_number)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 text-sm"
            >
              {versions.map((version) => (
                <option key={`from-${version.id}`} value={version.version_number}>
                  Version {getVersionLabel(version)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">To Version</label>
            <select
              name="target"
              defaultValue={String(toVersion.version_number)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-2.5 text-sm"
            >
              {versions.map((version) => (
                <option key={`to-${version.id}`} value={version.version_number}>
                  Version {getVersionLabel(version)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <GitCompareArrows size={16} />
            Compare
          </button>
          <Link
            href={appendFromParam(
              buildPathWithSearch(`/dashboard/research/${researchId}/compare`, [
                ['base', String(fromVersion.version_number)],
                ['target', String(toVersion.version_number)],
                ['changed', showOnlyChanged ? '0' : '1'],
              ]),
              resolvedSearchParams.from ?? `/dashboard/research/${researchId}`
            )}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {showOnlyChanged ? 'Show All Sections' : 'Only Changed'}
          </Link>
        </form>
      </div>

      <div className="grid gap-4">
        {displayedSections.length > 0 ? (
          displayedSections.map((section) => (
            <section
              key={section.key}
              className="rounded-xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold">{section.label}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Comparing Version {getVersionLabel(fromVersion)} to Version {getVersionLabel(toVersion)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    section.changed
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {section.changed ? 'Changed' : 'Unchanged'}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-7 whitespace-pre-wrap">
                {section.parts.length > 0 ? renderDiffParts(section.parts) : 'No content in either version.'}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
            No changed sections for the selected versions.
          </div>
        )}
      </div>
    </div>
  )
}
