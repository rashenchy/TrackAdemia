# TrackAdemia

TrackAdemia is a web-based Research and Thesis Tracking System built for students, mentors, and administrators. It centralizes research submission, review, section management, task tracking, institutional repository publishing, and writing-assistance tools inside a single Next.js application.

## Overview

The system is designed to reduce manual paperwork and scattered communication during capstone and thesis workflows. Instead of managing files, comments, revisions, and approval status across multiple tools, TrackAdemia keeps them in one authenticated platform.

At a high level, the platform supports:

- student research submission and revision tracking
- mentor/adviser review and annotation workflows
- section-based organization of students and classes
- task assignment and completion monitoring
- admin oversight, analytics, and approval tools
- institutional repository browsing for published research
- grammar and plagiarism assistance tools for writing support

## Core Roles

### Student

Students can:

- register and log in
- submit research records and upload documents
- belong to one or more sections
- collaborate with group members
- view teacher feedback and annotations
- manage personal and assigned tasks
- browse the repository of published works
- use the grammar checker and plagiarism checker

### Mentor / Adviser

Mentors can:

- manage their assigned sections
- monitor student submissions
- filter submissions by section
- annotate and review research documents
- assign tasks to entire sections
- track unresolved feedback and resubmissions
- use writing-assistance tools while reviewing student work

### Admin

Admins can:

- access a dedicated admin dashboard
- view institutional analytics
- manage announcements
- approve faculty accounts
- manage users
- inspect API/system monitoring pages
- manage master records
- view the system as a user when needed
- review reports and platform-wide statistics

## Main System Features

### 1. Authentication and Access Control

The app uses Supabase authentication and role-aware routing.

- public pages include the landing page, login, and registration
- authenticated users are routed into the dashboard
- admins are redirected into the admin area
- middleware protects `/dashboard` and `/admin`
- admin-only route access is verified both in middleware and page-level logic

Relevant files:

- [src/middleware.ts](C:/Users/LENOVO/Documents/programs/capstone/src/middleware.ts)
- [src/lib/supabase/middleware.ts](C:/Users/LENOVO/Documents/programs/capstone/src/lib/supabase/middleware.ts)
- [src/lib/supabase/server.ts](C:/Users/LENOVO/Documents/programs/capstone/src/lib/supabase/server.ts)
- [src/lib/supabase/client.ts](C:/Users/LENOVO/Documents/programs/capstone/src/lib/supabase/client.ts)

### 2. Dashboard Workspace

The main dashboard is the day-to-day workspace for students and mentors.

It includes:

- submission overview
- section-aware filtering for mentors
- live notification counts
- task management
- research submission forms
- repository access
- settings
- writing tools

Relevant files:

- [src/app/(main)/dashboard/layout.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/layout.tsx)
- [src/app/(main)/dashboard/layout-client.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/layout-client.tsx)
- [src/app/(main)/dashboard/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/page.tsx)

### 3. Research Submission and Review

Students can submit research information and maintain research records over time. Mentors can review submissions, annotate content, and monitor unresolved comments.

This workflow supports:

- submission of research title, metadata, and members
- document uploads and revisions
- shared group membership
- annotation-based review threads
- resubmission tracking
- status updates for review progress

Relevant files:

- [src/app/(main)/dashboard/submit/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/submit/page.tsx)
- [src/components/dashboard/ResearchSubmissionForm.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/ResearchSubmissionForm.tsx)
- [src/app/(main)/dashboard/research/[id]/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/research/[id]/page.tsx)
- [src/app/(main)/dashboard/research/[id]/annotate/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/research/[id]/annotate/page.tsx)
- [src/lib/research-review-status.ts](C:/Users/LENOVO/Documents/programs/capstone/src/lib/research-review-status.ts)

### 4. Section Management

Sections connect students to mentors and organize submissions by course or class grouping.

The section system allows:

- student membership in sections
- mentor-owned sections
- teacher-side section filtering on the dashboard
- section-based task broadcasting
- section join flows

Relevant files:

- [src/app/(main)/dashboard/sections/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/page.tsx)
- [src/app/(main)/dashboard/sections/join/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/join/page.tsx)
- [src/app/(main)/dashboard/sections/actions.ts](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/actions.ts)
- [src/components/dashboard/StudentSectionsUI.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/StudentSectionsUI.tsx)

### 5. Task Management

TrackAdemia includes a role-aware task manager.

Students can:

- create personal tasks
- track assigned teacher tasks
- track annotation-driven feedback tasks
- mark items resolved or unresolved

Mentors can:

- broadcast tasks to sections
- set due dates
- monitor completion statistics
- view simple analytics panels

Relevant files:

- [src/app/(main)/dashboard/tasks/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/tasks/page.tsx)
- [src/app/(main)/dashboard/tasks/actions.ts](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/tasks/actions.ts)
- [src/components/dashboard/TeacherAnalytics.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/TeacherAnalytics.tsx)

### 6. Institutional Repository

Published research can be exposed through a searchable repository experience.

Repository capabilities include:

- keyword search
- filtering by type
- sorting by date or title
- metadata display for authors and course codes
- abstract previews
- views/download counters
- access to full published records

Relevant files:

- [src/app/(main)/dashboard/repository/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/repository/page.tsx)
- [src/app/repository/[id]/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/repository/[id]/page.tsx)
- [src/components/dashboard/RepositorySearch.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/RepositorySearch.tsx)

### 7. Writing Assistance Tools

The dashboard includes built-in writing support tools:

- grammar checker
- plagiarism checker

#### Grammar Checker

The grammar checker sends submitted text to a server-side API route and returns sentence-level corrections.

Relevant files:

- [src/app/(main)/dashboard/grammar/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/grammar/page.tsx)
- [src/app/api/grammar-check/route.ts](C:/Users/LENOVO/Documents/programs/capstone/src/app/api/grammar-check/route.ts)

#### Plagiarism Checker

The plagiarism checker accepts pasted text, preprocesses it, ranks suspicious fragments, checks for possible online matches, and displays either:

- `No matches found`
- or suspicious text alongside matching text previews

The current implementation uses NLP-based filtering with `compromise`, `natural`, and `stopword` before checking candidate fragments.

Relevant files:

- [src/app/(main)/dashboard/plagiarism/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/plagiarism/page.tsx)
- [src/app/api/plagiarism-check/route.ts](C:/Users/LENOVO/Documents/programs/capstone/src/app/api/plagiarism-check/route.ts)
- [src/lib/plagiarism.ts](C:/Users/LENOVO/Documents/programs/capstone/src/lib/plagiarism.ts)

### 8. Admin Dashboard and Oversight

The admin area provides centralized control and reporting for the platform.

Admin modules currently include:

- overview analytics dashboard
- API monitoring
- announcements
- faculty approval
- master records
- users management
- reports
- view-as-user tooling

Relevant files:

- [src/app/(admin)/admin/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/page.tsx)
- [src/app/(admin)/admin/analytics/dashboard-client.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/analytics/dashboard-client.tsx)
- [src/app/(admin)/admin/users/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/users/page.tsx)
- [src/app/(admin)/admin/faculty-approval/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/faculty-approval/page.tsx)
- [src/app/(admin)/admin/announcements/page.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/announcements/page.tsx)

## Tech Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Lucide React icons
- Recharts for analytics visualization

### Backend / Platform Services

- Supabase Auth
- Supabase database queries via `@supabase/ssr` and `@supabase/supabase-js`
- Next.js route handlers for server-side APIs

### Document and NLP Utilities

- `@react-pdf-viewer/*` and `pdfjs-dist` for PDF viewing/annotation support
- `compromise` for sentence and term normalization
- `natural` for tokenization and NLP helpers
- `stopword` for additional stopword filtering

## System Architecture

The application follows a fairly standard App Router structure:

- `src/app/` contains route segments, pages, layouts, and API routes
- `src/components/` contains reusable UI components
- `src/lib/` contains shared server/client helpers and business logic
- `src/styles/` contains global styling
- `public/` contains static assets such as the logo and PDF worker

### Routing Model

- `/` is the public landing page
- `/(auth)` contains login and registration
- `/(main)/dashboard/*` contains authenticated student/mentor features
- `/(admin)/admin/*` contains admin-only tools
- `/api/*` contains server-side API endpoints
- `/repository/[id]` exposes public repository reading

### Rendering Pattern

The app mixes:

- Server Components for protected data fetching and redirects
- Client Components for interactive dashboard experiences
- route handlers for API-backed tools like grammar and plagiarism checking

## Real-Time and Notification Behavior

The dashboard client subscribes to Supabase realtime channels for selected tables so users can see:

- new assigned tasks
- resubmitted documents
- annotation updates
- task completion changes

The app also requests browser notification permission and surfaces notifications for important events.

Relevant file:

- [src/app/(main)/dashboard/layout-client.tsx](C:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/layout-client.tsx)

## Environment Variables

Create a `.env.local` file in the project root with the following values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
SERPAPI_KEY=your_serpapi_key
```

### Variable Usage

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: client/server Supabase access key used by the app
- `GEMINI_API_KEY`: used by the grammar checker API route
- `SERPAPI_KEY`: used by the plagiarism checker route for possible match lookup

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run the dev server

```bash
npm run dev
```

### 3. Open the app

Visit:

- `http://localhost:3000`

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

```text
src/
  app/
    (auth)/
      login/
      register/
    (main)/
      dashboard/
        grammar/
        plagiarism/
        repository/
        research/
        sections/
        settings/
        submit/
        tasks/
    (admin)/
      admin/
        analytics/
        announcements/
        api-monitoring/
        faculty-approval/
        master-records/
        reports/
        users/
        view-as-user/
    api/
      grammar-check/
      plagiarism-check/
    repository/
      [id]/
  components/
    auth/
    dashboard/
    public/
  lib/
    plagiarism.ts
    research-review-status.ts
    supabase/
  styles/
    globals.css
  types/
    stopword.d.ts
```

## Typical User Flows

### Student Flow

1. Register or log in.
2. Enter the dashboard.
3. Join a section or verify section membership.
4. Submit a research record.
5. Upload and revise documents as feedback arrives.
6. Track tasks and resolve adviser comments.
7. Use grammar/plagiarism tools before resubmitting.

### Mentor Flow

1. Log in and access the dashboard.
2. Manage sections and monitor student work.
3. Filter submissions by section.
4. Open a research item and annotate it.
5. Assign tasks to a section.
6. Track unresolved feedback and resubmissions.

### Admin Flow

1. Log in as admin.
2. Open the admin overview dashboard.
3. Review analytics and system activity.
4. Manage users, announcements, and faculty approvals.
5. Audit records and inspect platform usage.

## Notes and Limitations

- The project currently has existing lint issues outside the README and recently updated plagiarism files, so `npm run lint` may report unrelated errors in other parts of the codebase.
- Supabase table structure is assumed to exist and align with the queries used across the app.
- Writing-assistance outputs should still be reviewed by humans before being used for formal academic decisions.

## Summary

TrackAdemia is an academic workflow platform that combines research submission, review, task coordination, section management, repository publishing, and admin oversight into a single authenticated system. It is structured as a role-aware Next.js App Router application backed by Supabase and extended with writing-assistance tools for real student and mentor workflows.
