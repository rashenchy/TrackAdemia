# Workflows

## Registration
- Student registration may require email-code verification before account creation completes.
- Student profiles begin as unverified and await approval.
- Admin-created faculty accounts are created as verified mentor accounts.

## Section flow
- Teachers create sections with join codes.
- Students join with a valid join code if the section is not frozen.
- Students can leave sections.
- Teachers can remove students from their own sections.

## Research lifecycle
- `Draft` for saved student work
- `Pending Review` for initial student submission
- `Resubmitted` for later student submission after prior review
- `Revision Requested` when unresolved feedback requires changes
- `Approved` for reviewer approval without publication
- `Published` for public repository visibility
- `Rejected` for declined research

## Review flow
- Reviewers create annotations on PDF or text content.
- Students can reply to annotation threads.
- Students must make qualifying manuscript changes before resolving feedback.
- Reviewers can set `Revision Requested`, `Approved`, or `Published`.

## Publication flow
- Publishing requires a PDF manuscript.
- Public repository pages only expose `Published` research.
- `published_at` is set when research becomes published.

## Tasks and notifications
- Teacher section tasks create completion rows for active students.
- Submission, resubmission, verification, removal, and task events create notifications.
