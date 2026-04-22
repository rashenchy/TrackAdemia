# Architecture

## Overview
TrackAdemia is a Next.js App Router application backed by Supabase. The system is organized around three main work areas:

- public and authentication pages
- the shared dashboard used by students and mentors
- administrator pages for platform operations

Core business logic lives in `src/lib`, route-level orchestration lives in `src/app`, and persistent data is stored in Supabase tables described in `docs/database-schema.md`.

## Main stack
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase auth, database, storage, and realtime
- Nodemailer for verification and reset emails
- PDF and document tooling for manuscript review and export

## Top-level structure
- `src/app`
  Route groups for auth, dashboard, admin, API routes, and public repository pages.
- `src/components`
  Reusable UI grouped by feature area.
- `src/lib`
  Shared services and business logic.
- `src/styles`
  Global styles.
- `supabase`
  Schema and policy snapshots used as source-of-truth context.
- `docs`
  Human-facing project documentation for rules, workflows, schema, and architecture.
- `.agents/skills/thesis-platform`
  Codex skill instructions plus reference docs aligned with `docs/`.

## Route organization

### Public and auth routes
- `/`
- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

### Main dashboard routes
- `/dashboard`
- `/dashboard/submit`
- `/dashboard/research/[id]`
- `/dashboard/research/[id]/edit`
- `/dashboard/research/[id]/annotate`
- `/dashboard/research/[id]/compare`
- `/dashboard/sections`
- `/dashboard/tasks`
- `/dashboard/notifications`
- `/dashboard/profile`
- `/dashboard/repository`
- `/dashboard/student-submissions`

### Admin routes
- `/admin`
- `/admin/faculty-approval`
- `/admin/student-verification`
- `/admin/users`
- `/admin/announcements`
- `/admin/master-records`
- `/admin/reports`
- `/admin/api-monitoring`
- `/admin/view-as-user`

### API routes
- `/api/grammar-check`
- `/api/plagiarism-check`

## Application layers
- Route layer in `src/app`
- Shared domain logic in `src/lib`
- Supabase persistence and storage underneath

## Research subsystem
Key modules live in `src/lib/research`:

- `document`
- `files`
- `status`
- `workflow`
- `workspace`
- `annotations`
- `permissions`
- `publication`
- `versioning`

## Constraints
- Keep business logic in shared libraries when it is reused.
- Use existing Supabase and server action patterns.
- Cross-check workflow, role, and schema changes against the docs before editing.
