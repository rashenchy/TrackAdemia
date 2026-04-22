# Business Rules

## Roles
The system currently recognizes three profile roles:

- `student`
- `mentor`
- `admin`

`mentor` and `admin` are treated as faculty roles in shared access helpers.

## Account state rules
- Only active profiles should be treated as valid application users.
- Student registration creates a profile with `is_verified = false`.
- Student accounts require verification before the academic workspace is fully approved.
- Student rejection archives the profile by setting `is_active = false`, `deleted_at`, and `deleted_by`.
- Faculty account creation from the admin area creates already-verified mentor accounts.

## Registration and identity rules
- Student self-registration is the default public registration flow.
- Student number validation is required for student registration.
- Allowed course programs are restricted by app validation logic.
- Registration may require email-code verification before account creation is finalized.
- Email verification does not replace student approval; students still begin unverified.

## Research ownership rules
- A research record has one primary owner in `research.user_id`.
- Additional student collaborators can appear in `research.members`.
- Student author-group permissions include the primary owner and listed members.
- Mentor and admin users are treated as reviewers for annotation and review actions.

## Submission rules
- Students can save a research item as `Draft`.
- A non-draft student submission enters `Pending Review`.
- A mentor-created submission is immediately `Published`.
- Student submissions require a section/subject selection unless the flow is faculty-owned.
- Student submissions require a project start date when submitting for review.
- Research can be submitted as `pdf`, `text`, or `both` depending on the available content.
- Faculty submissions currently require a PDF manuscript.

## Review rules
- Only reviewers (`mentor` or `admin`) can create annotations and change quick review decisions.
- Review decisions exposed by the annotation workspace are:
  - `Revision Requested`
  - `Approved`
  - `Published`
- Publishing requires a publishable PDF to exist on the research record or in a later version.
- If unresolved annotations exist, the workflow can force the research status to `Revision Requested`.
- Students cannot resubmit while unresolved feedback still exists, except when the current item is still only a `Draft`.

## Annotation rules
- Mentors/admins can annotate research.
- Students and listed research participants can read feedback tied to their research.
- Students can only mark feedback resolved after they have made qualifying changes:
  - for text annotations, the annotated section must change in draft or versioned content
  - for PDF annotations, a newer student version must exist
- Annotation replies are discussion-thread messages tied to one annotation.

## Published research rules
- Public repository access is limited to research with status `Published`.
- Guests may browse published research metadata, details, and abstracts through public repository routes.
- Full manuscript file access for published research requires authentication and must be enforced server-side.
- Teachers can edit a published research workspace only if they are:
  - the publishing teacher/author
  - the linked adviser
  - a teacher connected through a section whose `course_code` matches the research `subject_code`

## Section rules
- Sections are created by teachers.
- A section has one owning teacher through `sections.teacher_id`.
- Students join sections by `join_code`.
- Frozen sections reject new joins.
- Existing banned memberships cannot rejoin through the normal join flow.
- Students can leave their own sections.
- Teachers can regenerate join codes for their own sections.
- Teachers can remove student members from their own sections and provide a reason.

## Task rules
- Tasks support personal student tasks and teacher-created section tasks.
- Teacher section tasks generate completion rows for active student members in the section.
- Completing a teacher-assigned task notifies the teacher.
- Annotation-derived task resolution is tied to annotation state and can affect research review status.

## Notification rules
The app currently writes these notification types:

- `section_removal`
- `section_joined`
- `join_request_approved`
- `join_request_rejected`
- `task_assigned`
- `task_completed`
- `research_submission`
- `research_resubmitted`
- `research_version_uploaded`
- `revision_requested`
- `annotation_added`
- `annotation_reply`
- `account_verified`
- `account_rejected`
- `announcement_created`

Notifications are deduplicated with `user_id + event_key`.

## Admin rules
- Only admins can create faculty accounts.
- Faculty account creation currently provisions `mentor` users.
- Student verification and rejection can be performed by faculty-role users in current server action logic.
- Admin pages manage announcements, users, API monitoring, analytics, reports, and record maintenance.

## Practical guardrails for future changes
- Do not add a new role without updating profile checks, policies, and route behavior together.
- Do not add research statuses without updating status helpers, workflow docs, and affected UI filters together.
- Do not add a join/approval workflow unless it is backed by existing schema and policy support.
