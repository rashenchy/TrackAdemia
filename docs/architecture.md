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
  Landing page.
- `/repository`
  Public repository browsing for published research metadata and abstracts.
- `/repository/[id]`
  Public published research detail page with metadata and abstract access.
- `/login`
  Email and password sign-in.
- `/register`
  Student registration.
- `/verify-email`
  Registration email verification flow.
- `/forgot-password`
  Reset-code request flow.
- `/reset-password`
  Password reset completion flow.

### Main dashboard routes
- `/dashboard`
  Shared home for students and mentors.
- `/dashboard/submit`
  Initial research submission form.
- `/dashboard/research/[id]`
  Research detail page.
- `/dashboard/research/[id]/edit`
  Submission editing page.
- `/dashboard/research/[id]/annotate`
  Review workspace for PDF and text annotations.
- `/dashboard/research/[id]/compare`
  Version comparison page.
- `/dashboard/sections`
  Section creation, membership, join, freeze, leave, and removal flows.
- `/dashboard/tasks`
  Personal and teacher-assigned tasks.
- `/dashboard/notifications`
  Notification list.
- `/dashboard/profile`
  Profile editing and password changes.
- `/dashboard/repository`
  Published repository browsing.
- `/dashboard/student-submissions`
  Mentor-facing attention list for student research.

### Admin routes
- `/admin`
  Admin overview.
- `/admin/faculty-approval`
  Faculty account creation.
- `/admin/student-verification`
  Student approval and rejection.
- `/admin/users`
  User management.
- `/admin/announcements`
  Announcement management.
- `/admin/master-records`
  Record maintenance and status updates.
- `/admin/reports`
  Export/report pages.
- `/admin/api-monitoring`
  API request log views and metrics.
- `/admin/view-as-user`
  Admin preview of non-admin experiences.

### API routes
- `/api/grammar-check`
- `/api/plagiarism-check`

## Application layers

### Route layer
Route files in `src/app/**/page.tsx` load data and render views. Route-level `actions.ts` files implement server actions for submissions, approval flows, section updates, and review operations.

### Domain/service layer
Feature logic is centralized in `src/lib`:

- `src/lib/research`
  Research document parsing, file handling, status helpers, review workflow, drafts, versions, permissions, publication logic, and workspace behavior.
- `src/lib/notifications`
  Notification creation and deduplicated batch inserts.
- `src/lib/users`
  Access helpers, pending registration support, teacher submission helpers, and password reset/session helpers.
- `src/lib/supabase`
  Server, client, admin, and middleware integration.
- `src/lib/core`
  Shared utilities like email, course validation, student number validation, and registration configuration.

### Persistence layer
Supabase stores:

- auth users
- profile records
- research, drafts, versions, annotations, replies
- sections and memberships
- tasks and task completions
- notifications
- announcements
- API request logs

Supabase Storage is used for uploaded manuscript files.

## Authentication and request flow
- Supabase auth is the identity provider.
- `src/proxy.ts` delegates session refresh to `src/lib/supabase/middleware`.
- Server actions typically begin by loading the authenticated user from Supabase.
- Higher-risk operations then check the caller's profile role and active state before writing.

## Research subsystem
The research feature is the core of the platform and is split across focused modules:

- `document`
  Normalizes editor content, stages, templates, and submission format rules.
- `files`
  Handles secure manuscript upload.
- `status`
  Defines supported research statuses used by the UI.
- `workflow`
  Sends teacher and student notifications tied to submission and review state.
- `workspace`
  Saves student drafts, student resubmissions, and teacher-authored workspace versions.
- `annotations`
  Creates and updates annotation records and replies.
- `permissions`
  Controls teacher access to published research editing.
- `publication`
  Controls `published_at` behavior and publishable PDF checks.
- `versioning`
  Computes the next version numbers and labels.

## Realtime and refresh behavior
- Several dashboard screens subscribe to Supabase realtime events.
- Research detail and annotation screens refresh on status and annotation changes.
- Task and notification views also depend on realtime or revalidation to stay current.
- Server actions commonly call `revalidatePath(...)` after writes.

## Architectural constraints
- Business logic should stay in shared libraries when used by multiple routes.
- Route actions should orchestrate, validate, and call existing helpers instead of duplicating rules.
- New role or workflow behavior must align with `docs/business-rules.md` and `docs/workflows.md`.
- New data fields must align with `docs/database-schema.md` and the Supabase schema snapshot.
