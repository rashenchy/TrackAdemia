# Workflows

## 1. Registration and access activation

### Student registration
1. Student submits the registration form with identity fields, course, email, password, and student number.
2. If registration email verification is enabled, the system creates a pending registration session and emails a verification code.
3. After successful code verification, the auth user and `profiles` row are created.
4. The new student profile starts as `role = student`, `is_verified = false`, `is_active = true`.
5. The student can sign in, but approval is still required for full verified status.

### Faculty account creation
1. An admin creates a faculty account from the admin area.
2. The system provisions an auth user and a `profiles` row with `role = mentor`.
3. Faculty accounts created this way are marked verified immediately.

### Student verification
1. A faculty-role user opens pending student verification.
2. Approving a student sets `profiles.is_verified = true`.
3. Rejecting a student sets `is_active = false` and records archival metadata.
4. The student receives an `account_verified` or `account_rejected` notification.

## 2. Section membership

### Create section
1. A teacher creates a section with `name` and `course_code`.
2. The system generates a unique join code.
3. The section is owned by `sections.teacher_id`.

### Join section
1. A student enters a join code.
2. The system rate-limits repeated failed attempts.
3. The section must exist and must not be frozen.
4. The student must not already be in the section and must not have a banned membership.
5. On success, a `section_members` row is inserted with `role = student`, `status = active`.
6. The teacher receives a `section_joined` notification.

### Leave or remove section membership
- Students may leave their own section membership.
- Teachers may remove student members from their own sections and must provide a reason.
- Removal triggers a `section_removal` notification.

## 3. Research submission lifecycle

## Supported research statuses
- `Draft`
- `Pending Review`
- `Resubmitted`
- `Revision Requested`
- `Approved`
- `Published`
- `Rejected`

## Supported stages used by the app
- `Proposal`
- `In Progress`
- `Final Manuscript`

## Submission paths

### Student draft save
1. Student creates or edits research content.
2. Saving as draft stores or updates the `research` row with `status = Draft`.
3. Workspace draft content may also be stored in `research_drafts`.

### Initial student submission
1. Student submits a non-draft research record.
2. The submission must have required metadata, section/subject selection, and start date.
3. Submission format is resolved from available PDF/text content.
4. The `research` row is created with `status = Pending Review`.
5. A first `research_versions` row is created when there is PDF or text submission content.
6. Teachers tied through adviser or matching section subject code are notified with `research_submission`.

### Student resubmission
1. Student updates the manuscript after feedback.
2. If the record is no longer a draft, unresolved annotations must be cleared before resubmission.
3. A new `research_versions` row is created.
4. The `research.status` becomes `Resubmitted`.
5. Teachers receive a `research_resubmitted` notification.

### Mentor-owned submission
1. Faculty can submit research directly.
2. Current server logic publishes faculty submissions immediately.
3. Faculty submissions currently require a PDF manuscript.

## 4. Review and annotation

### Annotation creation
1. A reviewer opens `/dashboard/research/[id]/annotate`.
2. The reviewer selects PDF text or editor text.
3. The system creates an `annotations` row anchored to the active research/version context.

### Annotation replies
1. Participants open an annotation thread.
2. Replies are stored in `annotation_replies`.
3. Thread visibility is limited to reviewers and research participants.

### Status decisions from review
Reviewers can manually set:
- `Revision Requested`
- `Approved`
- `Published`

Publishing rule:
- `Published` requires a publishable PDF to exist.

Automatic review status sync:
- When unresolved annotations exist, workflow sync can force the research into `Revision Requested`.
- When a student resolves annotation-linked work through task flows, the review status is re-evaluated.

## 5. Resolution rules for student feedback

### Text annotation resolution
1. Student edits the same annotated section in the manuscript editor.
2. The system compares the newer text to the annotated snapshot.
3. The annotation can be marked resolved only if the section content changed.

### PDF annotation resolution
1. Student uploads or submits a newer student manuscript version.
2. The annotation can be marked resolved only when that newer student version exists.

## 6. Workspace drafts and versions

### Student workspace draft
- Stored in `research_drafts` with `owner_role = student`.
- Also updates live `research.content_json`.

### Student workspace submit
- Creates a new `research_versions` snapshot.
- Moves the item to `Pending Review` if it was only a draft.
- Otherwise moves it to `Resubmitted`.

### Teacher workspace version
- Stored as a new `research_versions` row with `created_by_role = teacher`.
- Also maintains a teacher draft record in `research_drafts`.
- Published research editing is restricted to connected faculty users.

## 7. Publication and repository access
1. A reviewer sets a research item to `Published`.
2. `published_at` is set when status first becomes `Published`.
3. The public repository page only serves research where `status = Published`.
4. Public downloads use the latest version file when available, otherwise the base research file.

## 8. Tasks and notifications

### Personal tasks
- User-created tasks live in `tasks` with student-oriented task type usage.

### Teacher section tasks
1. Teacher creates a task for a section.
2. A `tasks` row is inserted.
3. The system creates `task_completions` rows for active students in that section.
4. Students receive `task_assigned` notifications.
5. When a student completes the task, the teacher receives a `task_completed` notification.

### Notification events tied to workflow
- `research_submission`
- `research_resubmitted`
- `research_version_uploaded`
- `revision_requested`
- `section_joined`
- `section_removal`
- `task_assigned`
- `task_completed`
- `account_verified`
- `account_rejected`
