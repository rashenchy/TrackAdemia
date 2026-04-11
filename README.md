<h1 align="center">
  TrackAdemia
</h1>

<h4 align="center">
  Role-aware research workflow platform for students, advisers, and administrators
</h4>

<p align="center">
  Manage submissions, annotated reviews, section coordination, repository publishing, and writing support in one academic workspace.
</p>

## Description

TrackAdemia is a web application built for research and thesis workflows in an academic setting. It gives students, mentors/advisers, and administrators a shared system for managing manuscript submissions, structured chapter writing, revision tracking, text and PDF review, section membership, task visibility, repository publishing, and platform administration.

The app is centered around one idea: keep research work moving inside a single workflow instead of splitting it across chats, email threads, spreadsheets, and disconnected files.

## Highlights

- Role-aware access for students, mentors, and admins
- Research submission with draft handling and metadata management
- PDF and text-based manuscript workflows
- Structured chapter editor with subsection support
- Annotation workspace with feedback threads and review actions
- Version history and side-by-side compare view
- Section creation, join codes, roster handling, and join locking
- Task manager for personal, teacher, and feedback-driven work
- Institutional repository for published research
- Grammar and plagiarism tools exposed through API routes
- Realtime dashboard counts and in-app popup notifications
- Admin tools for analytics, approvals, announcements, records, and monitoring

## Contents

- [Description](#description)
- [Highlights](#highlights)
- [Install](#install)
- [Usage](#usage)
- [Configuration](#configuration)
- [API](#api)
- [Development](#development)
- [Related Features](#related-features)
- [Team](#team)
- [License](#license)

## Install

### NPM

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

## Usage

### Student Workspace

Students can use TrackAdemia to:

- register and sign in
- wait for admin approval when required
- join sections with a join code
- submit research records with metadata and members
- write manuscripts in the built-in text workspace
- upload PDF manuscripts
- respond to adviser feedback
- revise and resubmit versions
- manage tasks, notifications, grammar checks, and plagiarism checks

### Adviser Workspace

Mentors/advisers can use TrackAdemia to:

- manage sections and student rosters
- lock or unlock sections to control joins
- review student submissions
- annotate PDF and text manuscripts
- save review edits in the workspace
- compare document versions
- monitor unresolved feedback and student progress

### Admin Workspace

Admins can use TrackAdemia to:

- monitor platform analytics
- approve faculty accounts
- verify student accounts
- manage users
- manage announcements
- inspect master records and reports
- monitor API usage
- preview the app as a student or mentor

### Manuscript Review Flow

TrackAdemia supports both uploaded PDF review and text-based chapter review.

- PDF submissions can be opened in the review workspace and annotated visually
- text submissions can be reviewed inside a structured manuscript workspace
- feedback is stored as anchored annotations
- students can resolve comments and resubmit new versions
- versions can be compared side by side with change highlighting

## Configuration

### Environment Variables

Create a `.env.local` file in the project root.

Core application setup:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Writing and analysis tools:

```env
GROQ_API_KEY=your_groq_api_key
SERPAPI_KEY=your_serpapi_key
```

Optional email verification flow:

```env
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
PENDING_REGISTRATION_SECRET=your_pending_registration_secret
```

### Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- Recharts
- `@react-pdf-viewer/*`
- Tiptap
- `natural`
- `compromise`
- `stopword`

## API

### Dashboard and App Areas

- `/dashboard` main student and adviser workspace
- `/dashboard/submit` research submission form
- `/dashboard/research/[id]` research details
- `/dashboard/research/[id]/annotate` unified review workspace
- `/dashboard/research/[id]/compare` version comparison
- `/dashboard/sections` student or mentor section management
- `/dashboard/tasks` task manager
- `/dashboard/repository` repository access inside the app
- `/admin` administrator workspace

### API Routes

#### Grammar Check

- Route: `/api/grammar-check`
- Purpose: checks grammar and returns structured corrections and explanations

#### Plagiarism Check

- Route: `/api/plagiarism-check`
- Purpose: analyzes input text, highlights suspicious passages, and returns candidate matches

## Development

### Local Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

### Project Structure

```text
src/
  app/
    (auth)/
    (main)/
      dashboard/
    (admin)/
      admin/
    api/
    repository/
  components/
    auth/
    dashboard/
    public/
    ui/
  lib/
    api-monitoring/
    core/
    notifications/
    plagiarism/
    research/
    supabase/
    users/
```

### Current Product Areas

- authentication and role-aware onboarding
- dashboard workspace and notifications
- research submission and revision workflow
- manuscript annotation and compare view
- section and roster management
- grammar and plagiarism support
- public and in-app repository browsing
- admin analytics and operations tooling

## Related Features

- Structured chapter editor for Chapter 1 to 5 workflows
- PDF and text manuscript review modes
- Version snapshots and change summaries
- Popup-based confirmations and in-app notifications
- View-as-user mode for admin previews

## Team

- Capstone project team

## License

[MIT](./license.md)
