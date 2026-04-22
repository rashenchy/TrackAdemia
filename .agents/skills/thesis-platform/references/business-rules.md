# Business Rules

## Roles
- `student`
- `mentor`
- `admin`

`mentor` and `admin` are faculty roles in shared access helpers.

## Account rules
- New students start unverified.
- Rejected students are archived by deactivating the profile.
- Admin-created faculty accounts are currently created as verified `mentor` accounts.

## Submission rules
- Students can save `Draft` research.
- Initial student submission becomes `Pending Review`.
- Student resubmission becomes `Resubmitted`.
- Faculty-owned submission currently publishes immediately.
- Student submission requires section/subject selection and start date.

## Review rules
- Only reviewers (`mentor` or `admin`) can annotate and use quick review decisions.
- Quick review decisions are `Revision Requested`, `Approved`, and `Published`.
- Publishing requires a PDF manuscript to exist.
- Unresolved annotations can force a research item into `Revision Requested`.

## Annotation rules
- Students can only resolve feedback after meaningful manuscript changes.
- Text annotations require section text changes.
- PDF annotations require a newer student version.

## Section rules
- Teachers create sections.
- Students join by join code.
- Frozen sections block new joins.
- Teachers can remove students from their own sections.

## Repository rules
- Only `Published` research is public.
- Published research editing is limited to connected faculty users defined by current permission helpers.
