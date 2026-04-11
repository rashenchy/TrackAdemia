# TrackAdemia

TrackAdemia is a role-aware academic research workflow platform for students, advisers, and administrators. It brings submission management, manuscript review, section coordination, notifications, repository publishing, and admin operations into one shared system.

## What It Does

TrackAdemia supports the full research workflow:

- student and faculty registration
- email verification for registration
- Gmail-based forgot-password recovery with reset codes
- secure profile updates and change-password flow
- research submission as PDF, structured text, or both
- version tracking and resubmission
- PDF and text annotation workflows
- section membership and join-code management
- notifications, task tracking, and dashboard summaries
- grammar and plagiarism checking
- admin analytics, approvals, announcements, user management, and API monitoring

## User Roles

### Students

Students can:

- register and verify email ownership
- wait for admin verification when required
- join sections using a join code
- create research records
- submit draft or final research content
- upload PDF manuscripts
- write structured manuscript content in the built-in editor
- review feedback, resolve revisions, and resubmit
- manage tasks, notifications, and profile details
- recover accounts through Gmail reset-code verification

### Mentors / Advisers

Mentors can:

- review assigned student submissions
- annotate PDF and text manuscripts
- track unresolved review comments
- monitor section activity and student progress
- manage research guidance inside the same dashboard flow

### Administrators

Admins can:

- access analytics and dashboard summaries
- approve faculty registrations
- verify student accounts
- manage announcements
- manage users
- inspect master records and reports
- monitor API usage
- preview the app as a student or mentor through view-as-user mode

## Core Features

### Authentication

- email and password sign-in
- registration with Gmail-delivered verification code
- forgot-password flow with Gmail-delivered reset code
- reset-password page with code verification and password confirmation
- profile page password change with current-password verification

### Research Workflow

- create research submissions with metadata, members, adviser details, and timeline fields
- support proposal, Chapter 1-3, and final manuscript stages
- choose PDF, text, or combined submission format where allowed
- keep version history for uploaded manuscript changes
- compare research versions side by side

### Review and Feedback

- review submitted PDFs with annotation support
- review text-based manuscript sections inside the app
- anchored feedback and unresolved annotation tracking
- revision-requested workflow for students

### Sections and Collaboration

- join a section using a code
- manage section rosters
- support adviser-linked section workflows
- keep submission activity tied to academic groups

### Notifications and Tasks

- in-app notifications for submission and review events
- task visibility inside the dashboard
- popup-based confirmations and success/error feedback

### Admin Operations

- faculty approval workflow
- student verification workflow
- announcement publishing
- user management
- API monitoring
- analytics dashboard

## App Routes

### Public and Auth

- `/` landing page
- `/login` sign in
- `/register` account registration
- `/verify-email` registration email verification
- `/forgot-password` forgot-password entry page
- `/reset-password` Gmail reset-code password reset page

### Main Workspace

- `/dashboard` student or mentor dashboard
- `/dashboard/submit` research submission form
- `/dashboard/research/[id]` research details
- `/dashboard/research/[id]/annotate` review workspace
- `/dashboard/research/[id]/compare` version comparison
- `/dashboard/research/[id]/edit` edit submission
- `/dashboard/sections` section management
- `/dashboard/tasks` tasks
- `/dashboard/profile` profile and password management
- `/dashboard/settings` account settings
- `/dashboard/repository` repository browsing

### Admin Workspace

- `/admin` overview dashboard
- `/admin/faculty-approval`
- `/admin/student-verification`
- `/admin/users`
- `/admin/announcements`
- `/admin/master-records`
- `/admin/reports`
- `/admin/api-monitoring`
- `/admin/view-as-user`

### API Routes

- `/api/grammar-check`
- `/api/plagiarism-check`

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- Nodemailer with Gmail SMTP
- Tiptap
- React PDF Viewer
- Recharts
- `natural`
- `compromise`
- `stopword`

## Environment Variables

Create a `.env.local` file in the project root.

### Required Core Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Email and Verification

```env
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
PENDING_REGISTRATION_SECRET=your_pending_registration_secret
PASSWORD_RESET_SECRET=your_password_reset_secret
```

### Optional Analysis Services

```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
SERPAPI_KEY=your_serpapi_key
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run start
```

Open `http://localhost:3000`.

## Project Structure

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
    navigation/
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
  styles/
  types/
```

## Notes

- Gmail SMTP is used for registration verification and forgot-password recovery.
- Password reset now uses Gmail verification codes instead of emailed generated passwords.
- Profile page change-password remains a separate authenticated flow.
- Admin approval and user-management actions use in-app UI confirmation dialogs instead of browser default confirms.

## License

[MIT](./LICENSE)
