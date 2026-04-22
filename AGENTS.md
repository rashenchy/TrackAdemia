# Project instructions

## What this project is
This is TrackAdemia, a web-based academic research and mentorship platform built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.
It supports student submissions, mentor review, section management, notifications, repository publishing, and administrator operations.

## Non-negotiable rules
- Do not invent database columns, enums, or workflows.
- Always check docs/ before changing business logic.
- Prefer existing patterns over new architecture.
- If a requirement conflicts with current code, explain the conflict first.
- When editing role-based logic, verify access rules against docs/business-rules.md.
- When editing data models, verify against docs/database-schema.md.
- When editing workflow/status logic, verify against docs/workflows.md.
- When editing route structure, dashboard behavior, or service boundaries, verify against docs/architecture.md.

## Coding standards
- Keep changes minimal and scoped.
- Do not rename files or functions unless necessary.
- Avoid adding dependencies unless required.
- Follow existing Next.js App Router, server action, and Supabase patterns already used in `src/app` and `src/lib`.
- Prefer existing research helpers in `src/lib/research/*`, notification helpers in `src/lib/notifications/*`, and access helpers in `src/lib/users/*` before adding new logic.
- After changes, explain what was modified and what assumptions were made.

## Documentation map
- `docs/architecture.md`: app structure, route groups, service boundaries, and major modules.
- `docs/business-rules.md`: roles, permissions, review behavior, section rules, and repository access.
- `docs/database-schema.md`: actual tables, key fields, and important constraints from Supabase.
- `docs/workflows.md`: registration, section join, research submission, review, revision, publication, and notifications.

## Done when
- Code matches the documented rules.
- No fake fields or fake workflow states were introduced.
- Relevant files were checked before editing.
