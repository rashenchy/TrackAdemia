# Database Schema

## Source of truth
This document is based on `supabase/supabase.txt` and current application usage. Field names below match the schema snapshot. Do not introduce columns that are not listed here.

## Core tables

### `profiles`
Purpose: stores app-level identity and access state for each auth user.

Key fields:
- `id` `uuid` primary key, also references `auth.users.id`
- `first_name` `text`
- `last_name` `text`
- `middle_name` `text | null`
- `course_program` `text`
- `role` `text`, allowed values: `student`, `mentor`, `admin`
- `is_verified` `boolean`
- `student_number` `varchar | null`
- `is_active` `boolean`
- `updated_at` `timestamptz`
- `deleted_at` `timestamptz | null`
- `deleted_by` `uuid | null`

### `research`
Purpose: primary research submission record.

Key fields:
- `id` `uuid` primary key
- `created_at` `timestamptz`
- `user_id` `uuid` primary student owner
- `title` `text`
- `type` `text`
- `abstract` `text`
- `academic_year` `text | null`
- `subject_code` `text | null`
- `adviser_id` `text | null`
- `status` `text`, default `Pending Review`
- `members` `uuid[]`
- `member_roles` `text[]`
- `research_area` `text | null`
- `start_date` `date | null`
- `target_defense_date` `date | null`
- `current_stage` `text`, default `Proposal`
- `file_url` `text | null`
- `original_file_name` `text | null`
- `submission_format` `text`, default `pdf`
- `content_json` `jsonb | null`
- `department` `text | null`
- `keywords` `text[]`
- `views_count` `integer`
- `downloads_count` `integer`
- `published_at` `timestamptz | null`

Observed status values from current code:
- `Draft`
- `Pending Review`
- `Resubmitted`
- `Revision Requested`
- `Approved`
- `Published`
- `Rejected`

Observed stage values from current code:
- `Proposal`
- `In Progress`
- `Final Manuscript`

Observed submission format values from current code:
- `pdf`
- `text`
- `both`

### `research_versions`
Purpose: immutable manuscript/version snapshots.

Key fields:
- `id` `uuid` primary key
- `research_id` `uuid`
- `uploaded_by` `uuid`
- `file_url` `text | null`
- `version_number` `integer`
- `version_major` `integer | null`
- `version_minor` `integer`
- `version_label` `text | null`
- `created_by_role` `text | null`
- `change_type` `text | null`
- `change_summary` `text | null`
- `content_json` `jsonb | null`
- `original_file_name` `text | null`
- `created_at` `timestamptz`

Current app usage writes `created_by_role` as:
- `student`
- `teacher`

Current app usage writes `change_type` such as:
- `student_submit`
- `teacher_submit`
- `teacher_edit`

### `research_drafts`
Purpose: active workspace drafts separate from published/versioned snapshots.

Key fields:
- `id` `uuid` primary key
- `research_id` `uuid`
- `owner_role` `text`, allowed values: `student`, `teacher`
- `owner_user_id` `uuid`
- `base_version_id` `uuid | null`
- `content_json` `jsonb | null`
- `change_summary` `text | null`
- `is_active` `boolean`
- `created_at` `timestamptz`
- `updated_at` `timestamptz`

### `annotations`
Purpose: anchored review comments on PDF or text content.

Key fields:
- `id` `uuid` primary key
- `research_id` `uuid`
- `user_id` `uuid`
- `quote` `text`
- `comment_text` `text`
- `position_data` `jsonb`
- `is_resolved` `boolean`
- `created_at` `timestamptz`
- `version_id` `uuid | null`
- `version_number` `integer | null`
- `version_major` `integer | null`
- `version_minor` `integer | null`
- `version_lineage_key` `text | null`
- `source_type` `text | null`, allowed values: `pdf`, `text`

### `annotation_replies`
Purpose: discussion replies attached to one annotation thread.

Key fields:
- `id` `uuid` primary key
- `annotation_id` `uuid`
- `user_id` `uuid`
- `message` `text`
- `created_at` `timestamptz`

Note:
- Current route actions attempt to update `is_edited` on replies, but `supabase/supabase.txt` does not list an `is_edited` column. Treat the schema snapshot as authoritative until confirmed otherwise.

## Collaboration and classroom tables

### `sections`
Purpose: teacher-owned academic sections.

Key fields:
- `id` `uuid` primary key
- `name` `text`
- `course_code` `text`
- `teacher_id` `uuid`
- `join_code` `text`, unique
- `is_archived` `boolean`
- `is_frozen` `boolean`
- `created_at` `timestamptz`

### `section_members`
Purpose: section roster entries.

Key fields:
- `id` `uuid` primary key
- `section_id` `uuid | null`
- `user_id` `uuid | null`
- `role` `text`, allowed values: `student`, `teacher`
- `status` `text`, allowed values: `pending`, `active`, `banned`
- `joined_at` `timestamptz`

## Tasking and notification tables

### `tasks`
Purpose: personal tasks, teacher section tasks, and annotation-linked work.

Key fields:
- `id` `uuid` primary key
- `title` `text`
- `description` `text | null`
- `type` `task_type`
- `status` `task_status`
- `created_by` `uuid`
- `created_at` `timestamptz`
- `section_id` `uuid | null`
- `annotation_id` `uuid | null`
- `due_date` `timestamptz | null`

Current app usage indicates:
- `type`: `student`, `teacher`
- `status`: `unresolved`, `resolved`

### `task_completions`
Purpose: per-student completion state for teacher-assigned tasks.

Key fields:
- `id` `uuid` primary key
- `task_id` `uuid`
- `student_id` `uuid`
- `is_completed` `boolean`
- `completed_at` `timestamptz | null`

### `user_notifications`
Purpose: in-app notifications.

Key fields:
- `id` `uuid` primary key
- `user_id` `uuid`
- `actor_id` `uuid`
- `section_id` `uuid | null`
- `notification_type` `text`
- `title` `text`
- `message` `text`
- `reason` `text | null`
- `is_read` `boolean`
- `created_at` `timestamptz`
- `reference_id` `uuid | null`
- `event_key` `text | null`

Allowed `notification_type` values in schema:
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

## Administrative and analytics tables

### `announcements`
Purpose: admin-managed announcement records.

Key fields:
- `id` `uuid` primary key
- `title` `text`
- `message` `text`
- `type` `text`, allowed values: `info`, `warning`, `success`, `urgent`
- `created_by` `uuid | null`
- `created_at` `timestamptz`
- `expires_at` `timestamptz | null`
- `is_active` `boolean`

### `api_request_logs`
Purpose: API monitoring and operational reporting.

Key fields:
- `id` `uuid` primary key
- `provider` `text`, allowed values: `gemini`, `groq`, `serpapi`, `supabase`
- `api_name` `text`
- `endpoint` `text | null`
- `user_id` `uuid | null`
- `status` `text`, allowed values: `success`, `failed`, `validation_error`
- `response_time_ms` `integer`
- `input_units` `integer`
- `output_units` `integer`
- `error_message` `text | null`
- `metadata` `jsonb`
- `created_at` `timestamptz`

## Repository support tables

### `research_bookmarks`
- `id`
- `user_id`
- `research_id`
- `created_at`

### `research_downloads`
- `id`
- `research_id`
- `user_id`
- `downloaded_at`

### `research_views`
- `id`
- `research_id`
- `user_id`
- `viewed_at`

## Foreign-key relationships worth remembering
- `profiles.id -> auth.users.id`
- `research.user_id -> auth.users.id`
- `research_versions.research_id -> research.id`
- `research_drafts.research_id -> research.id`
- `annotations.research_id -> research.id`
- `annotation_replies.annotation_id -> annotations.id`
- `sections.teacher_id -> auth.users.id`
- `section_members.section_id -> sections.id`
- `tasks.section_id -> sections.id`
- `tasks.annotation_id -> annotations.id`
- `task_completions.task_id -> tasks.id`
- `user_notifications.section_id -> sections.id`
