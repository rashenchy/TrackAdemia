import Image from 'next/image'
import Link from 'next/link'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Files,
  GraduationCap,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { Reveal } from '@/components/marketing/Reveal'

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
})

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const workflowSteps = [
  {
    icon: FileSearch,
    title: 'Start a research record',
    text: 'Create a workspace for your title, abstract, members, and document trail.',
  },
  {
    icon: Files,
    title: 'Upload and version chapters',
    text: 'Keep every revision in one timeline so teams stop passing files around manually.',
  },
  {
    icon: MessageSquareMore,
    title: 'Receive annotated feedback',
    text: 'Advisers leave contextual comments directly on the manuscript.',
  },
  {
    icon: Clock3,
    title: 'Track tasks and resubmissions',
    text: 'Students know what is pending and mentors see what changed.',
  },
]

const valueCards = [
  {
    icon: GraduationCap,
    title: 'Student-ready workspace',
    text: 'Deadlines, uploads, revision notes, and status updates live in one place.',
    tone: 'from-blue-200/70 via-sky-100/55 to-white/50',
  },
  {
    icon: MessageSquareMore,
    title: 'Adviser review flow',
    text: 'Comment on documents, follow unresolved issues, and keep review cycles moving.',
    tone: 'from-yellow-200/65 via-blue-100/45 to-white/45',
  },
  {
    icon: UserRoundCog,
    title: 'Admin oversight',
    text: 'Manage users, announcements, approvals, and platform-wide research activity.',
    tone: 'from-sky-200/70 via-yellow-100/45 to-white/50',
  },
]

const statChips = [
  'Centralized submissions',
  'Revision history',
  'Annotated feedback',
  'Task tracking',
]

const systemMetrics = [
  { value: 'One', label: 'shared platform for students, advisers, and administrators' },
  { value: 'Every', label: 'revision tracked in a visible, reviewable timeline' },
  { value: 'Clear', label: 'task ownership, status visibility, and approval flow' },
]

const rolePanels = [
  {
    name: 'Students',
    text: 'Upload drafts, track revisions, and understand exactly what is pending.',
  },
  {
    name: 'Advisers',
    text: 'Review faster with annotations, task visibility, and cleaner version history.',
  },
  {
    name: 'Admins',
    text: 'Oversee approvals, faculty access, announcements, and research activity.',
  },
]

type RepositoryPreviewPaper = {
  id: string
  user_id: string
  title?: string | null
  abstract?: string | null
  academic_year?: string | null
  published_at?: string | null
  created_at?: string | null
  members?: string[]
}

function getLandingPaperYear(paper: RepositoryPreviewPaper) {
  if (paper.academic_year?.trim()) {
    return paper.academic_year
  }

  if (paper.published_at) {
    return String(new Date(paper.published_at).getFullYear())
  }

  if (paper.created_at) {
    return String(new Date(paper.created_at).getFullYear())
  }

  return 'Unknown Year'
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: previewPapers } = await supabase
    .from('research')
    .select('id, user_id, title, abstract, academic_year, published_at, created_at, members')
    .eq('status', 'Published')
    .order('published_at', { ascending: false })
    .limit(3)

  const previewAuthorMap: Record<string, string> = {}

  if (previewPapers && previewPapers.length > 0) {
    const profileIds = new Set<string>()

    previewPapers.forEach((paper) => {
      profileIds.add(paper.user_id)
      paper.members?.forEach((memberId: string) => profileIds.add(memberId))
    })

    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .in('id', Array.from(profileIds))

      profiles?.forEach((profile) => {
        previewAuthorMap[profile.id] = `${profile.first_name} ${profile.last_name}`
      })
    }
  }

  return (
    <main
      className={`${bodyFont.className} min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f4f9ff_0%,#fffdf5_38%,#ffffff_100%)] text-slate-950`}
    >
      <div className="relative isolate">
        <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.18),transparent_24%),radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.1),transparent_35%),linear-gradient(180deg,#f4f9ff_0%,#fffdf5_38%,#ffffff_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(59,130,246,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.08)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)] animate-[pulse_grid_10s_ease-in-out_infinite]" />
        <div className="absolute left-[-7rem] top-24 -z-10 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl animate-[orb_14s_ease-in-out_infinite]" />
        <div className="absolute right-[-4rem] top-12 -z-10 h-80 w-80 rounded-full bg-yellow-200/55 blur-3xl animate-[orb_18s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl animate-[float_11s_ease-in-out_infinite]" />

        <section className="mx-auto max-w-7xl px-6 pb-20 pt-8 md:px-10 lg:px-12">
          <Reveal variant="up">
            <header className="flex flex-col gap-4 rounded-full border border-white/80 bg-white/78 px-4 py-3 shadow-[0_18px_50px_rgba(148,163,184,0.18)] backdrop-blur md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Image src="/logo.png" alt="TrackAdemia logo" width={24} height={24} className="rounded-md" />
                </div>
                <div>
                  <p className={`${headingFont.className} text-lg font-semibold tracking-tight text-slate-900`}>
                    TrackAdemia
                  </p>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Research workflow system
                  </p>
                </div>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <Link href="#system" className="rounded-full px-4 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700">
                  Platform
                </Link>
                <Link href="#workflow" className="rounded-full px-4 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700">
                  Workflow
                </Link>
                <Link href="#roles" className="rounded-full px-4 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700">
                  Roles
                </Link>
                <Link
                  href="/repository"
                  className="rounded-full border border-blue-200 bg-blue-600 px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  View Repository
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-blue-100 bg-white px-4 py-2 font-semibold text-blue-700 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Login
                </Link>
              </nav>
            </header>
          </Reveal>

          <div className="grid min-h-[calc(100vh-7rem)] items-center gap-14 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div className="max-w-3xl">
              <Reveal delay={80}>
                <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700 shadow-[0_16px_40px_rgba(148,163,184,0.12)] backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.75)]" />
                  Less paperwork. Better momentum.
                </div>
              </Reveal>

              <Reveal delay={170}>
                <h1
                  className={`${headingFont.className} mt-8 text-5xl font-bold leading-[0.92] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl`}
                >
                  A premium operating layer for
                  <span className="block bg-[linear-gradient(90deg,#1d4ed8_0%,#38bdf8_38%,#2563eb_62%,#facc15_100%)] bg-clip-text text-transparent">
                    research submissions,
                    reviews, and approvals.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={260}>
                <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                  Replace scattered files and unclear status updates with one polished system for
                  students, advisers, and administrators.
                </p>
              </Reveal>

              <Reveal delay={340}>
                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563eb,#38bdf8)] px-7 py-4 text-sm font-bold text-white shadow-[0_24px_60px_rgba(37,99,235,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_rgba(37,99,235,0.3)]"
                  >
                    Enter TrackAdemia
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="#workflow"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/90 px-7 py-4 text-sm font-bold text-blue-700 shadow-[0_18px_40px_rgba(148,163,184,0.14)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                  >
                    Explore the workflow
                    <Sparkles size={16} />
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={430}>
                <div className="mt-10 flex flex-wrap gap-3">
                  {statChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={180} variant="scale">
              <div className="relative">
                <div className="absolute inset-0 rounded-[2.4rem] bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(250,204,21,0.12),rgba(255,255,255,0.2))] blur-2xl" />
                <div className="relative overflow-hidden rounded-[2.2rem] border border-white/90 bg-white/70 p-4 shadow-[0_35px_90px_rgba(148,163,184,0.18)] backdrop-blur-2xl">
                  <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.8),transparent)]" />
                  <div className="rounded-[1.9rem] border border-blue-100/70 bg-[linear-gradient(160deg,#0f3f8c_0%,#2563eb_54%,#7dd3fc_100%)] p-5 text-white">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/20">
                          <Image src="/logo.png" alt="TrackAdemia" width={28} height={28} className="rounded-lg" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-blue-100/80">
                            Workspace
                          </p>
                          <h2 className={`${headingFont.className} text-xl font-semibold text-white`}>
                            Capstone Progress Board
                          </h2>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold text-white">
                        84% complete
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {[
                        ['Submission', '12', 'Versions archived'],
                        ['Feedback', '7', 'Advisor notes resolved'],
                        ['Approval', '2', 'Steps remaining'],
                      ].map(([label, value, detail], index) => (
                        <div
                          key={label}
                          className="rounded-[1.4rem] border border-white/12 bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        >
                          <p className="text-[11px] uppercase tracking-[0.22em] text-blue-100/80">{label}</p>
                          <p className={`${headingFont.className} mt-2 text-3xl font-bold text-white`}>
                            {value}
                          </p>
                          <p className={`mt-1 text-sm ${index === 1 ? 'text-yellow-50' : 'text-blue-50/90'}`}>
                            {detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-[1.7rem] border border-blue-100 bg-white/95 p-5 text-slate-900">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">
                            Current focus
                          </p>
                          <h3 className={`${headingFont.className} mt-2 text-2xl font-semibold tracking-tight`}>
                            Chapter 4 methodology revision
                          </h3>
                        </div>
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                          Due in 2 days
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {[
                          'Research record created and metadata completed',
                          'Adviser comments attached to latest draft',
                          'Student task list synced with revision status',
                        ].map((item) => (
                          <div
                            key={item}
                            className="flex items-start gap-3 rounded-[1.25rem] border border-blue-100 bg-blue-50/80 px-4 py-3"
                          >
                            <CheckCircle2 size={18} className="mt-0.5 text-blue-600" />
                            <p className="text-sm leading-6 text-slate-600">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="repository-preview" className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_68%,#fefce8_100%)] p-6 shadow-[0_30px_80px_rgba(148,163,184,0.16)] md:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.75),transparent)]" />

            <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
              <Reveal>
                <div className="lg:sticky lg:top-10">
                  <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700 shadow-sm">
                    <BookOpen size={14} />
                    Public repository preview
                  </div>

                  <h2 className={`${headingFont.className} mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl`}>
                    Open the repository to browse published work before you sign in.
                  </h2>
                  <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
                    Guests can explore titles, authors, academic years, and abstracts. Full manuscript access stays protected until login.
                  </p>

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <Link
                      href="/repository"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-600 px-7 py-4 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
                    >
                      View Repository
                      <ArrowRight size={18} />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-7 py-4 text-sm font-bold text-blue-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50"
                    >
                      Log In for Full Access
                    </Link>
                  </div>
                </div>
              </Reveal>

              <div className="space-y-4">
                {(previewPapers ?? []).length > 0 ? (
                  (previewPapers as RepositoryPreviewPaper[]).map((paper, index) => {
                    const authorIds =
                      paper.members && paper.members.length > 0 ? paper.members : [paper.user_id]
                    const authorNames = authorIds
                      .map((authorId: string) => previewAuthorMap[authorId] || 'Unknown Author')
                      .join(', ')

                    return (
                      <Reveal key={paper.id} delay={index * 120} variant="right">
                        <article className="rounded-[1.8rem] border border-blue-100/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">
                                Published research
                              </p>
                              <h3 className={`${headingFont.className} mt-2 text-2xl font-semibold tracking-tight text-slate-950`}>
                                {paper.title}
                              </h3>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                              {getLandingPaperYear(paper)}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
                            <span className="flex items-center gap-2">
                              <Users size={14} className="text-blue-600" /> {authorNames}
                            </span>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span className="flex items-center gap-2">
                              <Calendar size={14} className="text-amber-500" /> Metadata + abstract only for guests
                            </span>
                          </div>

                          <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                            {paper.abstract}
                          </p>

                          <div className="mt-5 flex items-center justify-between border-t border-blue-50 pt-4">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                              Full manuscript requires login
                            </p>
                            <Link
                              href={`/repository/${paper.id}`}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition-colors hover:text-blue-800"
                            >
                              View Details <ChevronRight size={16} />
                            </Link>
                          </div>
                        </article>
                      </Reveal>
                    )
                  })
                ) : (
                  <Reveal variant="right">
                    <div className="rounded-[1.8rem] border border-dashed border-blue-100 bg-white/80 p-8 text-center text-slate-500">
                      Published repository previews will appear here once research entries are available.
                    </div>
                  </Reveal>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="system" className="mx-auto max-w-7xl px-6 pb-8 md:px-10 lg:px-12">
          <Reveal>
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-700">
                System clarity
              </p>
              <h2 className={`${headingFont.className} mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl`}>
                The platform feels intelligent because every layer serves a clear purpose.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                The structure stays familiar, but the experience becomes sharper, calmer, and more reliable from first glance to final approval.
              </p>
            </div>
          </Reveal>

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              'Structured for momentum',
              'Refined for clarity',
              'Designed for real teams',
            ].map((item, index) => (
              <Reveal key={item} delay={index * 90}>
                <div className="rounded-full border border-blue-100/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                  {item}
                </div>
              </Reveal>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {valueCards.map((card, index) => (
              <Reveal key={card.title} delay={index * 120}>
                <article className="group relative overflow-hidden rounded-[1.9rem] border border-blue-100/80 bg-white/88 p-7 shadow-[0_20px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:bg-white">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.tone} opacity-90`} />
                  <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.65),transparent)]" />
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                      <card.icon size={24} />
                    </div>
                    <h3 className={`${headingFont.className} mt-6 text-2xl font-semibold text-slate-950`}>
                      {card.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-600">{card.text}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(219,234,254,0.72),rgba(255,255,255,0.96))] p-6 shadow-[0_26px_70px_rgba(148,163,184,0.14)] md:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.7),transparent)]" />
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-yellow-200/60 blur-3xl" />
            <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-200/60 blur-3xl" />

            <Reveal>
              <div className="mb-8 max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-700">
                  Platform signals
                </p>
                <h2 className={`${headingFont.className} mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl`}>
                  The experience stays bright, but the system still feels precise and engineered.
                </h2>
              </div>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-3">
            {systemMetrics.map((metric, index) => (
              <Reveal key={metric.label} delay={index * 110}>
                <div className="rounded-[1.7rem] border border-blue-100 bg-white/92 px-6 py-7 shadow-[0_18px_48px_rgba(148,163,184,0.12)] backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                  <p className={`${headingFont.className} text-4xl font-bold tracking-tight text-slate-950`}>
                    {metric.value}
                  </p>
                  <p className="mt-3 max-w-xs text-sm leading-7 text-slate-600">{metric.label}</p>
                </div>
              </Reveal>
            ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-6 py-12 md:px-10 lg:px-12">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-blue-100 bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_32%,#fffdf1_100%)] p-6 shadow-[0_30px_80px_rgba(148,163,184,0.16)] md:p-8">
            <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_58%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.8),transparent)]" />
            <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
            <Reveal>
              <div className="lg:sticky lg:top-10">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-yellow-600">
                  How it moves
                </p>
                <h2 className={`${headingFont.className} mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl`}>
                  Designed to keep research work moving instead of stalling in email threads.
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  Each stage is visible, trackable, and easier to act on for everyone involved.
                </p>
              </div>
            </Reveal>

            <div className="space-y-5">
              {workflowSteps.map((step, index) => (
                <Reveal key={step.title} delay={index * 120} variant="right">
                  <article className="group relative overflow-hidden rounded-[2rem] border border-blue-100/80 bg-white/92 p-6 shadow-[0_22px_60px_rgba(148,163,184,0.14)] backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-200">
                    <div className="absolute left-0 top-0 h-full w-px bg-[linear-gradient(180deg,rgba(59,130,246,0.65),transparent)]" />
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-blue-100/60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-70" />
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                          <step.icon size={24} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Step 0{index + 1}</p>
                          <h3 className={`${headingFont.className} mt-2 text-2xl font-semibold text-slate-950`}>
                            {step.title}
                          </h3>
                          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{step.text}</p>
                        </div>
                      </div>
                      <span className="self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Visible workflow
                      </span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
          <div className="overflow-hidden rounded-[2.4rem] border border-blue-100 bg-[linear-gradient(145deg,#eaf4ff_0%,#dbeafe_38%,#fff9db_100%)] p-6 shadow-[0_30px_80px_rgba(148,163,184,0.16)] md:p-10">
            <div className="mb-8 flex flex-wrap gap-3">
              {['Student flow', 'Review flow', 'Admin visibility'].map((item, index) => (
                <Reveal key={item} delay={index * 80}>
                  <span className="rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {item}
                  </span>
                </Reveal>
              ))}
            </div>
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <Reveal>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-700">
                    Built for every role
                  </p>
                  <h2 className={`${headingFont.className} mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl`}>
                    One platform, three perspectives, fewer bottlenecks.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                    Students stay organized, advisers review with context, and administrators keep the whole pipeline visible.
                  </p>
                </div>
              </Reveal>

              <div className="grid gap-4">
                {rolePanels.map((panel, index) => (
                  <Reveal key={panel.name} delay={index * 120} variant="left">
                    <div className="rounded-[1.7rem] border border-white/80 bg-white/82 p-5 shadow-[0_16px_42px_rgba(148,163,184,0.12)] backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className={`${headingFont.className} text-2xl font-semibold text-slate-950`}>
                          {panel.name}
                        </h3>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">
                          Active view
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{panel.text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24 pt-6 text-center md:px-10">
          <Reveal variant="scale">
            <div className="relative overflow-hidden rounded-[2.4rem] border border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_60%,#fefce8_100%)] px-6 py-12 shadow-[0_26px_70px_rgba(148,163,184,0.14)] backdrop-blur-xl md:px-10 md:py-14">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.9),transparent)]" />
              <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-blue-100/70 blur-3xl" />
              <div className="absolute -right-6 bottom-6 h-32 w-32 rounded-full bg-yellow-100/80 blur-3xl" />
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-600 text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]">
                <ShieldCheck size={28} />
              </div>
              <h2 className={`${headingFont.className} mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl`}>
                Make the first impression feel like a real platform.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Sign in to continue with submissions, section management, adviser feedback, and admin oversight from one place.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563eb,#38bdf8)] px-8 py-4 text-sm font-bold text-white shadow-[0_24px_60px_rgba(37,99,235,0.24)] transition-all duration-300 hover:-translate-y-0.5"
                >
                  Open Login
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#workflow"
                  className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-8 py-4 text-sm font-bold text-blue-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  See the workflow again
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </main>
  )
}
