# Database Schema

## Core tables

### `profiles`
- `id`
- `first_name`
- `last_name`
- `middle_name`
- `course_program`
- `role`: `student`, `mentor`, `admin`
- `is_verified`
- `student_number`
- `is_active`
- `updated_at`
- `deleted_at`
- `deleted_by`

### `research`
- `id`
- `created_at`
- `user_id`
- `title`
- `type`
- `abstract`
- `subject_code`
- `adviser_id`
- `status`
- `members`
- `member_roles`
- `research_area`
- `start_date`
- `target_defense_date`
- `current_stage`
- `file_url`
- `original_file_name`
- `submission_format`
- `content_json`
- `department`
- `views_count`
- `downloads_count`
- `published_at`
- `keywords`

Observed status values in current code:
- `Draft`
- `Pending Review`
- `Resubmitted`
- `Revision Requested`
- `Approved`
- `Published`
- `Rejected`

### `research_versions`
- `id`
- `research_id`
- `uploaded_by`
- `file_url`
- `version_number`
- `created_at`
- `original_file_name`
- `content_json`
- `version_major`
- `version_minor`
- `version_label`
- `created_by_role`
- `change_type`
- `change_summary`

### `research_drafts`
- `id`
- `research_id`
- `owner_role`: `student`, `teacher`
- `owner_user_id`
- `base_version_id`
- `content_json`
- `change_summary`
- `is_active`
- `created_at`
- `updated_at`

### `annotations`
- `id`
- `research_id`
- `user_id`
- `quote`
- `comment_text`
- `position_data`
- `is_resolved`
- `created_at`
- `version_id`
- `version_number`
- `version_major`
- `version_minor`
- `version_lineage_key`
- `source_type`: `pdf`, `text`

### `annotation_replies`
- `id`
- `annotation_id`
- `user_id`
- `message`
- `created_at`

## Collaboration tables

### `sections`
- `id`
- `name`
- `course_code`
- `teacher_id`
- `join_code`
- `is_archived`
- `created_at`
- `is_frozen`

### `section_members`
- `id`
- `section_id`
- `user_id`
- `role`: `student`, `teacher`
- `joined_at`
- `status`: `pending`, `active`, `banned`

## Task and notification tables

### `tasks`
- `id`
- `title`
- `description`
- `type`
- `status`
- `created_by`
- `created_at`
- `section_id`
- `annotation_id`
- `due_date`

### `task_completions`
- `id`
- `task_id`
- `student_id`
- `is_completed`
- `completed_at`

### `user_notifications`
- `id`
- `user_id`
- `actor_id`
- `section_id`
- `notification_type`
- `title`
- `message`
- `reason`
- `is_read`
- `created_at`
- `reference_id`
- `event_key`

### `announcements`
- `id`
- `title`
- `message`
- `type`
- `created_by`
- `created_at`
- `expires_at`
- `is_active`

### `api_request_logs`
- `id`
- `provider`
- `api_name`
- `endpoint`
- `user_id`
- `status`
- `response_time_ms`
- `input_units`
- `output_units`
- `error_message`
- `metadata`
- `created_at`

## Repository support tables
- `research_bookmarks`
- `research_downloads`
- `research_views`
