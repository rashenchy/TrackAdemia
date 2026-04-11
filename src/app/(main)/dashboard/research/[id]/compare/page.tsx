import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GitCompareArrows } from 'lucide-react'
import { buildResearchVersionDiff, type VersionDiffPart } from '@/lib/research/version-diff'
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

function renderLineParts(parts: VersionDiffPart[]) {
  if (parts.length === 0) {
    return <span className="text-gray-300"> </span>
  }

  return parts.map((part, index) => {
    const className =
      part.kind === 'added'
        ? 'rounded bg-green-200/80 text-green-950'
        : part.kind === 'removed'
          ? 'rounded bg-rose-200/80 text-rose-950'
          : 'text-slate-700'

    return (
      <span key={`${index}-${part.value.slice(0, 12)}`} className={className}>
        {part.value || ' '}
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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

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
    .select(
      'id, version_number, version_major, version_minor, version_label, created_by_role, change_summary, created_at, content_json, original_file_name'
    )
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

  const toVersionNumber = Number(resolvedSearchParams.target) || versions[0]?.version_number || 1
  const defaultFromVersion =
    versions.find((version) => version.version_number !== toVersionNumber)?.version_number ||
    toVersionNumber
  const fromVersionNumber = Number(resolvedSearchParams.base) || defaultFromVersion

  const fromVersion =
    versions.find((version) => version.version_number === fromVersionNumber) || versions[0]
  const toVersion = versions.find((version) => version.version_number === toVersionNumber) || versions[0]

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
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <BackButton
          fallbackHref={`/dashboard/research/${researchId}`}
          className="rounded-full bg-gray-100 p-2 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare Versions</h1>
          <p className="mt-1 text-gray-500">{research.title}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <input type="hidden" name="changed" value={showOnlyChanged ? '1' : '0'} />
          <input type="hidden" name="from" value={resolvedSearchParams.from ?? ''} />
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Original Version
            </label>
            <select
              name="base"
              defaultValue={String(fromVersion.version_number)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            >
              {versions.map((version) => (
                <option key={`from-${version.id}`} value={version.version_number}>
                  Version {getVersionLabel(version)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Updated Version
            </label>
            <select
              name="target"
              defaultValue={String(toVersion.version_number)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
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
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showOnlyChanged ? 'Show All Sections' : 'Only Changed'}
          </Link>
        </form>
      </div>

      <div className="grid gap-5">
        {displayedSections.length > 0 ? (
          displayedSections.map((section) => (
            <section key={section.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{section.label}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Version {getVersionLabel(fromVersion)} to Version {getVersionLabel(toVersion)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      section.changed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {section.changed
                      ? `${section.changedPartCount} change${section.changedPartCount === 1 ? '' : 's'}`
                      : 'Unchanged'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
                    <div className="border-r border-slate-200 px-6 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Original</p>
                      <p className="mt-1 text-sm text-slate-600">Removed text is highlighted in red.</p>
                    </div>
                    <div className="px-6 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Updated</p>
                      <p className="mt-1 text-sm text-slate-600">Added text is highlighted in green.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="border-r border-slate-200 bg-slate-50/45 px-6 py-5">
                      <div className="min-h-48 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words text-slate-800">
                        {renderLineParts(section.oldParts)}
                      </div>
                    </div>

                    <div className="bg-white px-6 py-5">
                      <div className="min-h-48 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words text-slate-800">
                        {renderLineParts(section.newParts)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            No changed sections for the selected versions.
          </div>
        )}
      </div>
    </div>
  )
}
