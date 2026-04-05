# TrackAdemia

TrackAdemia is a role-aware research and thesis workflow platform for students, mentors/advisers, and administrators. It centralizes submissions, document review, section management, task tracking, repository publishing, notifications, and academic writing support inside one Next.js application.

## What The App Does Today

The current webapp supports:

- student and mentor registration with role-specific onboarding fields
- login with role-based redirects to the dashboard or admin area
- student-number validation and course-program validation during signup
- optional email-verification flow for signup, with server-side verification code handling
- admin approval gates for student and faculty access
- research submission with draft recovery, metadata, members, adviser selection, and file tracking
- adviser review workflows with annotations, resubmissions, and unresolved feedback counts
- student and teacher task management
- section membership management for students and section administration for mentors
- a searchable institutional repository for published research
- grammar and plagiarism tools exposed through API routes
- realtime in-app updates and browser notifications for tasks, submissions, annotations, and user notifications
- admin analytics, announcements, API monitoring, student verification, faculty approval, user management, master records, reports, and view-as-user preview mode

## Roles

### Student

Students can:

- register and log in
- maintain a profile and view approval state
- join and view sections
- submit and revise research records
- collaborate with group members listed on a research item
- track personal tasks, teacher-assigned tasks, and annotation-driven work
- read announcements and notifications
- browse the published repository
- use the grammar checker and plagiarism checker

### Mentor / Adviser

Mentors can:

- manage their sections
- review student submissions across sections and advisory relationships
- annotate manuscripts and track unresolved feedback
- assign section-wide tasks with deadlines
- monitor simple student task analytics
- use the same writing-assistance tools available in the dashboard

### Admin

Admins can:

- access the admin workspace and analytics dashboard
- approve pending faculty accounts
- verify pending student accounts
- manage users, announcements, reports, and master records
- inspect API monitoring data
- preview the app as a student or mentor with view-as-user mode

## Main Product Areas

### Authentication And Onboarding

TrackAdemia uses Supabase authentication with server-side actions and role-aware redirects.

- public entry points live at `/`, `/login`, `/register`, and `/verify-email`
- login redirects admins to `/admin` and other users to `/dashboard`
- registration validates role, course/program, and student number format
- there is a pending-registration email-code flow in the codebase
- student and mentor accounts still rely on admin approval for full access

Key files:

- [src/app/(auth)/login/actions.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(auth)/login/actions.ts)
- [src/app/(auth)/register/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(auth)/register/page.tsx)
- [src/app/(auth)/verify-email/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(auth)/verify-email/page.tsx)
- [src/lib/users/pending-registration.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/users/pending-registration.ts)
- [src/lib/core/student-number.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/core/student-number.ts)
- [src/middleware.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/middleware.ts)

Note:

- the email-verification UI and flow exist, but [src/lib/core/registration-config.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/core/registration-config.ts) currently has email verification turned off by default

### Dashboard Workspace

The main dashboard is the daily workspace for non-admin users.

It currently includes:

- a role-aware home page
- announcement cards
- recent notifications
- student submission overviews
- mentor submission previews with a dedicated full submissions page
- dashboard badges for unresolved work, notifications, and submission alerts
- pending-access states for unapproved students and mentors
- admin preview rendering when using view-as-user mode

Key files:

- [src/app/(main)/dashboard/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/page.tsx)
- [src/app/(main)/dashboard/layout.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/layout.tsx)
- [src/app/(main)/dashboard/layout-client.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/layout-client.tsx)
- [src/app/(main)/dashboard/student-submissions/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/student-submissions/page.tsx)
- [src/lib/users/admin-view-mode.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/users/admin-view-mode.ts)

### Research Submission And Review

Research records are the core unit of work in the app.

The workflow currently supports:

- draft lookup for the latest in-progress submission
- metadata capture such as title, abstract, keywords, subject code, research area, stage, dates, and adviser
- member selection from classmates in shared sections
- document upload and replacement flows
- annotation-based feedback and resolution tracking
- resubmission and status progression
- publication and repository exposure for published records

Key files:

- [src/app/(main)/dashboard/submit/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/submit/page.tsx)
- [src/components/dashboard/ResearchSubmissionForm.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/ResearchSubmissionForm.tsx)
- [src/app/(main)/dashboard/research/[id]/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/research/[id]/page.tsx)
- [src/app/(main)/dashboard/research/[id]/annotate/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/research/[id]/annotate/page.tsx)
- [src/lib/research/workflow.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/research/workflow.ts)
- [src/lib/research/review.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/research/review.ts)
- [src/lib/research/status.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/research/status.ts)
- [src/lib/research/publication.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/research/publication.ts)
- [src/lib/research/files.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/research/files.ts)

### Sections

Sections organize students under mentors and shape task and submission visibility.

Current section capabilities include:

- mentor-owned section dashboards
- roster views for each section
- student membership views
- section join flow
- teacher-side analytics summaries for roster and submission activity

Key files:

- [src/app/(main)/dashboard/sections/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/page.tsx)
- [src/app/(main)/dashboard/sections/join/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/join/page.tsx)
- [src/app/(main)/dashboard/sections/actions.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/actions.ts)
- [src/app/(main)/dashboard/sections/SectionsPageUI.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/sections/SectionsPageUI.tsx)
- [src/components/dashboard/StudentSectionsUI.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/StudentSectionsUI.tsx)

### Tasks And Feedback Tracking

The task manager combines multiple sources of work into one place.

For students:

- personal tasks
- teacher-assigned section tasks
- annotation-derived feedback tasks
- resolved and unresolved filtering
- inline edit and delete actions for personal tasks

For mentors:

- section-wide task broadcasting
- optional deadlines
- completion tracking
- simple section analytics
- quick visibility into unresolved annotation volume

Key files:

- [src/app/(main)/dashboard/tasks/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/tasks/page.tsx)
- [src/app/(main)/dashboard/tasks/actions.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/tasks/actions.ts)
- [src/components/dashboard/TeacherAnalytics.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/TeacherAnalytics.tsx)

### Repository

The institutional repository exposes published research through searchable public-facing and dashboard-accessible pages.

Current repository behavior includes:

- published-only filtering
- keyword search across title, abstract, type, subject code, research area, years, keywords, authors, and adviser names
- filtering by research type
- sorting by newest, oldest, or title
- view and download counters
- public detail pages and dashboard-linked reading flows

Key files:

- [src/app/(main)/dashboard/repository/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/repository/page.tsx)
- [src/app/repository/[id]/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/repository/[id]/page.tsx)
- [src/components/dashboard/RepositorySearch.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/components/dashboard/RepositorySearch.tsx)
- [src/components/public/PublicDownloadButton.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/components/public/PublicDownloadButton.tsx)

### Notifications And Realtime UX

The dashboard shell listens for live changes and updates the user experience accordingly.

Current behavior includes:

- unread notification counts
- browser notifications for new tasks, resubmissions, and user notifications
- live refresh of task, annotation, submission, and notification badges
- recent notifications on the dashboard home page
- section-removal notification handling

Key files:

- [src/app/(main)/dashboard/layout-client.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/layout-client.tsx)
- [src/app/(main)/dashboard/notifications/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/notifications/page.tsx)
- [src/lib/notifications/service.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/notifications/service.ts)
- [src/lib/notifications/types.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/notifications/types.ts)

### Writing Support Tools

TrackAdemia ships with two API-backed writing tools.

#### Grammar Checker

- available at `/dashboard/grammar`
- accepts up to 3000 characters
- calls Groq from a server route
- returns sentence-level corrections and explanations
- logs usage into the API monitoring system

Key files:

- [src/app/(main)/dashboard/grammar/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/grammar/page.tsx)
- [src/app/api/grammar-check/route.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/app/api/grammar-check/route.ts)

#### Plagiarism Checker

- available at `/dashboard/plagiarism`
- preprocesses input text and splits it into candidate sentences
- selects top fragments, searches them through SerpAPI, and analyzes possible matches
- returns highlights, candidate matches, and a summary level
- logs usage into the API monitoring system

Key files:

- [src/app/(main)/dashboard/plagiarism/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(main)/dashboard/plagiarism/page.tsx)
- [src/app/api/plagiarism-check/route.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/app/api/plagiarism-check/route.ts)
- [src/lib/plagiarism/service.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/plagiarism/service.ts)

### Admin Workspace

The admin area is broader than the old README described. It currently includes:

- overview analytics with total users, pending faculty, published papers, pending papers, research-by-program, research-type distribution, and most-viewed research
- API monitoring
- announcements
- faculty approval
- student verification
- users management
- master records
- reports
- view-as-user preview mode

Key files:

- [src/app/(admin)/admin/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/page.tsx)
- [src/app/(admin)/admin/analytics/dashboard-client.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/analytics/dashboard-client.tsx)
- [src/app/(admin)/admin/api-monitoring/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/api-monitoring/page.tsx)
- [src/app/(admin)/admin/announcements/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/announcements/page.tsx)
- [src/app/(admin)/admin/faculty-approval/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/faculty-approval/page.tsx)
- [src/app/(admin)/admin/student-verification/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/student-verification/page.tsx)
- [src/app/(admin)/admin/users/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/users/page.tsx)
- [src/app/(admin)/admin/master-records/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/master-records/page.tsx)
- [src/app/(admin)/admin/reports/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/reports/page.tsx)
- [src/app/(admin)/admin/view-as-user/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/(admin)/admin/view-as-user/page.tsx)
- [src/lib/api-monitoring/service.ts](/c:/Users/LENOVO/Documents/programs/capstone/src/lib/api-monitoring/service.ts)

## Landing Page

The public homepage has already been refreshed to reflect the current product direction. It highlights:

- research record creation
- chapter and revision tracking
- annotated adviser feedback
- task and resubmission visibility
- separate value propositions for students, advisers, and admins

Key file:

- [src/app/page.tsx](/c:/Users/LENOVO/Documents/programs/capstone/src/app/page.tsx)

## Tech Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Lucide React
- Recharts

### Backend And Platform

- Supabase Auth and database access
- Next.js Server Components, Server Actions, and Route Handlers
- Nodemailer for email delivery

### Document And NLP Utilities

- `@react-pdf-viewer/*`
- `pdfjs-dist`
- `compromise`
- `natural`
- `stopword`

## Routing Overview

- `/` public landing page
- `/login` sign-in page
- `/register` role-aware signup page
- `/verify-email` verification-code page for pending registration flow
- `/dashboard/*` authenticated student and mentor workspace
- `/admin/*` admin-only workspace
- `/api/grammar-check` grammar-check route
- `/api/plagiarism-check` plagiarism-check route
- `/repository/[id]` public repository detail page

## Environment Variables

Create a `.env.local` file in the project root.

Required for core auth and database access:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Recommended for admin-assisted account creation:

```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Required for the writing tools:

```env
GROQ_API_KEY=your_groq_api_key
SERPAPI_KEY=your_serpapi_key
```

Needed if you want registration email codes enabled in config:

```env
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
PENDING_REGISTRATION_SECRET=your_pending_registration_secret
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Available scripts:

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
      verify-email/
    (main)/
      dashboard/
        grammar/
        notifications/
        plagiarism/
        profile/
        repository/
        research/
        sections/
        settings/
        student-submissions/
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
        student-verification/
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
    api-monitoring/
    core/
    notifications/
    plagiarism/
    research/
    users/
```

## Notes

- the existing codebase includes both approval gating and email-verification building blocks, but email verification is currently configured as off by default
- the app assumes a Supabase schema that matches the tables queried throughout the dashboard, admin, notifications, tasks, research, and repository features