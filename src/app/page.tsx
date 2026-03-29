import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Files,
  GraduationCap,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
} from 'lucide-react'

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
    title: 'Student-ready workspace',
    text: 'Deadlines, uploads, revision notes, and status updates live in one place.',
    accent: 'from-blue-600 to-sky-400',
  },
  {
    title: 'Adviser review flow',
    text: 'Comment on documents, follow unresolved issues, and keep review cycles moving.',
    accent: 'from-yellow-500 to-amber-300',
  },
  {
    title: 'Admin oversight',
    text: 'Manage users, announcements, approvals, and platform-wide research activity.',
    accent: 'from-blue-500 to-yellow-400',
  },
]

const statChips = [
  'Centralized submissions',
  'Revision history',
  'Annotated feedback',
  'Task tracking',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#eef6ff_0%,#fff8d9_45%,#ffffff_100%)] text-slate-950 selection:bg-blue-100">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(250,204,21,0.24),transparent_24%),radial-gradient(circle_at_50%_85%,rgba(96,165,250,0.18),transparent_28%)]" />
        <div className="absolute left-[-6rem] top-28 -z-10 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl animate-[orb_13s_ease-in-out_infinite]" />
        <div className="absolute right-[-4rem] top-16 -z-10 h-64 w-64 rounded-full bg-yellow-200/60 blur-3xl animate-[orb_15s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-6 left-1/2 -z-10 h-52 w-52 -translate-x-1/2 rounded-full bg-sky-200/45 blur-3xl animate-[float_10s_ease-in-out_infinite]" />

        <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-14 px-6 pb-20 pt-10 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12">
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(148,163,184,0.18)] backdrop-blur">
              <Image src="/logo.png" alt="TrackAdemia logo" width={26} height={26} className="rounded-md" />
              TrackAdemia
            </div>

            <div className="mt-8 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-700">
                Less paperwork. Better momentum.
              </p>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                A brighter home for
                <span className="block bg-[linear-gradient(90deg,#1d4ed8,#60a5fa,#facc15)] bg-clip-text text-transparent">
                  research submissions,
                </span>
                reviews, and approvals.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Replace scattered files and unclear status updates with one polished system for
                students, advisers, and administrators.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.25)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Enter TrackAdemia
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/85 px-7 py-4 text-sm font-bold text-blue-700 shadow-[0_10px_30px_rgba(148,163,184,0.18)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5"
              >
                Explore the workflow
                <Sparkles size={16} />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {statChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10 overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_35px_80px_rgba(15,23,42,0.14)] backdrop-blur">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2563eb,#60a5fa,#facc15)]" />

              <div className="rounded-[1.5rem] bg-[linear-gradient(160deg,#12306b_0%,#1d4ed8_50%,#facc15_125%)] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logo.png"
                      alt="TrackAdemia"
                      width={42}
                      height={42}
                      className="rounded-xl border border-white/15 bg-white/10 p-1.5"
                    />
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-blue-100">Workspace</p>
                      <h2 className="text-lg font-bold">Capstone Progress Board</h2>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-yellow-50">
                    84% complete
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-100/85">Submission</p>
                    <p className="mt-2 text-2xl font-black">12</p>
                    <p className="mt-1 text-sm text-blue-50/90">Versions archived</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-yellow-100/90">Feedback</p>
                    <p className="mt-2 text-2xl font-black">7</p>
                    <p className="mt-1 text-sm text-blue-50/90">Advisor notes resolved</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-yellow-100/90">Approval</p>
                    <p className="mt-2 text-2xl font-black">2</p>
                    <p className="mt-1 text-sm text-blue-50/90">Steps remaining</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.4rem] bg-white/95 p-5 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">
                        Current focus
                      </p>
                      <h3 className="mt-1 text-xl font-bold">Chapter 4 methodology revision</h3>
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
                      <div key={item} className="flex items-start gap-3 rounded-2xl bg-blue-50/60 px-4 py-3">
                        <CheckCircle2 size={18} className="mt-0.5 text-blue-600" />
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8 md:px-10 lg:px-12">
        <div className="grid gap-5 md:grid-cols-3">
          {valueCards.map((card, index) => (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_18px_50px_rgba(148,163,184,0.14)] transition-transform duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                {index === 0 && <GraduationCap size={24} />}
                {index === 1 && <MessageSquareMore size={24} />}
                {index === 2 && <UserRoundCog size={24} />}
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-900">{card.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-600">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-yellow-600">
            How it moves
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Designed to keep research work moving instead of stalling in email threads.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Each stage is visible, trackable, and easier to act on for everyone involved.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-[1.9rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(148,163,184,0.12)] backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <step.icon size={24} />
                </div>
                <span className="text-sm font-black text-slate-300">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 md:px-10 lg:px-12">
        <div className="overflow-hidden rounded-[2.2rem] bg-[linear-gradient(140deg,#12306b_0%,#2563eb_52%,#facc15_130%)] px-6 py-10 text-white shadow-[0_28px_80px_rgba(37,99,235,0.24)] md:px-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-100">
                Built for every role
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">
                One platform, three perspectives, fewer bottlenecks.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-50/95">
                Students stay organized, advisers review with context, and administrators keep the
                whole pipeline visible.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                ['Students', 'Upload drafts, track revisions, and understand exactly what is pending.'],
                ['Advisers', 'Review faster with annotations, task visibility, and cleaner version history.'],
                ['Admins', 'Oversee approvals, faculty access, announcements, and research activity.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[1.6rem] border border-white/20 bg-white/12 p-5 backdrop-blur">
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-blue-50/95">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 text-center md:px-10">
        <div className="rounded-[2rem] border border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_62%,#fffbea_100%)] px-6 py-12 shadow-[0_20px_60px_rgba(148,163,184,0.16)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h2 className="mt-6 text-4xl font-black tracking-tight text-slate-950">
            Make the first impression feel like a real platform.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Sign in to continue with submissions, section management, adviser feedback, and admin
            oversight from one place.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Open Login
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#workflow"
              className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-8 py-4 text-sm font-bold text-blue-700 transition-transform duration-300 hover:-translate-y-0.5"
            >
              See the workflow again
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
