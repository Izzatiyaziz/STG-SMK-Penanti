# Project Development Guide

---

# 1. Project Overview

STG SMK Penanti is a school academic marking and reporting system for SMK Penanti. It supports role-based access for administrators, teachers, subject coordinators, students, and the principal.

The system purpose is to centralize student/class/teacher/subject management, exam setup, objective and subjective mark entry, OMR scanning, coordinator approval, report card generation, and student result viewing.

Target users:

| User | Purpose |
|---|---|
| Admin | Manage teachers, students, classes, subjects, exams, assignments, sessions, and system usage. |
| Subject Teacher | Enter marks, scan OMR sheets, review class/subject performance, and submit results. |
| Class Teacher | Manage own class students, generate class report cards, add comments, and view analytics. |
| Subject Coordinator | Manage teacher-subject assignments, answer schemes, marking settings, approvals, and reports. |
| Principal | View academic overview and manage class teacher assignments. |
| Student | View dashboard, report card, and performance trend/result pages. |

Current development status: active development / partial production prototype. The project has many implemented user-facing modules and API routes, but the database base schema is not fully present in the repository, validation is mostly manual, testing is not found, and several modules are placeholder or partially wired.

---

# 2. Tech Stack

| Area | Technology | Evidence / Notes |
|---|---|---|
| Frontend framework | Next.js App Router | `next@16.1.1`, `app/` routes. |
| UI runtime | React 19 | `react@19.2.3`, `react-dom@19.2.3`. |
| Language | TypeScript | `tsconfig.json`, `.tsx` routes/components. |
| Backend framework | Next.js Route Handlers | API routes under `app/api/**/route.ts`. |
| OMR backend | FastAPI | `omr-service/main.py`, `fastapi==0.115.6`. |
| Database | Supabase PostgreSQL | `@supabase/supabase-js`, tables named `stg_*`. |
| Authentication | Custom signed cookie auth | `lib/auth.ts` signs/verifies `stg_auth`; no Supabase Auth usage found. |
| Password hashing | bcryptjs | Login and password change use bcrypt comparison/hashing. |
| Styling | Tailwind CSS 4 + shadcn/ui CSS variables | `app/globals.css`, `components.json`, `components/ui/*`. |
| Theme | next-themes | `components/theme-provider.tsx`, `ModeToggle`. |
| State management | Local React state + browser storage | `localStorage` key `stg_session`, `sessionStorage` for OMR result. |
| Tables | TanStack React Table | `@tanstack/react-table`, `components/data-table.tsx`. |
| Charts | Recharts | dashboards and chart components. |
| Notifications | Sonner | `Toaster` in `app/layout.tsx`. |
| Icons | lucide-react, Tabler, react-icons | Sidebar and UI icons. |
| Email | Nodemailer / Gmail service | `app/api/auth/forgot-password/route.ts`. |
| AI service | JamAI through OMR FastAPI service | `omr-service/main.py` imports `jamaibase`; `/report-comment`. |
| Image processing | OpenCV + NumPy | OMR grading service. |
| Deployment | Vercel suggested for Next.js; standalone Python service for OMR | README mentions Vercel; OMR docs describe local FastAPI deployment. No CI/CD config found. |
| File storage | Not found in current codebase | Uploads are passed as base64/multipart; no persistent storage service found. |

Important libraries:

| Library | Use |
|---|---|
| `@supabase/supabase-js` | Database queries from route handlers. |
| `@supabase/ssr` | Installed, but no meaningful usage found in current codebase. |
| `bcryptjs` | Admin/teacher password verification and password updates. |
| `nodemailer` | Teacher forgot-password temporary password emails. |
| `zod` | Installed and used only in `components/data-table.tsx`; API validation is mostly manual. |
| `date-fns` | Date formatting/utilities. |
| `sonner` | Toast messages. |
| `recharts` | Dashboard/report charts. |
| `opencv-python-headless` | OMR sheet detection and answer grading. |
| `jamaibase` | Optional AI report comment generation. |

---

# 3. Folder Structure

| Path | Purpose | Important files / notes |
|---|---|---|
| `app/` | Next.js App Router pages, layouts, global styles, and API routes. | Role folders: `admin/`, `teacher/`, `coordinator/`, `principal/`, `student/`; API under `app/api/`. |
| `app/api/` | Backend route handlers. | Auth, admin, teacher, coordinator, principal, and student APIs. |
| `app/admin/` | Admin UI. | Dashboard, users, teacher, student, classes, subjects, exams, reports, profile. |
| `app/teacher/` | Teacher UI. | Dashboard, my class, my subject, OMR, report cards, analytics, profile. |
| `app/coordinator/` | Subject coordinator UI. | Dashboard, assignments, approvals, answer schemes, reports. |
| `app/principal/` | Principal UI. | Dashboard and class teacher assignment. |
| `app/student/` | Student UI. | Dashboard, report card, my results, profile. |
| `components/` | Shared UI and app shell components. | Sidebar, nav, site header, system footer, charts, profile shell, shadcn/ui components. |
| `components/ui/` | shadcn/ui-style primitives. | Button, card, table, dialog, select, sidebar, tabs, tooltip, etc. |
| `components/admin/` | Admin-specific UI components. | `system-usage-table.tsx`. |
| `components/profile/` | Shared profile page shell. | `profile-shell.tsx`. |
| `lib/` | Shared utilities, auth, Supabase clients, navigation config, marking templates. | `auth.ts`, `supabase.ts`, `supabase-admin.ts`, `sidebar-config.ts`, `marking-template.ts`. |
| `hooks/` | Shared React hooks. | `use-mobile.ts`. |
| `db/` | SQL migrations and seed data. | Partial migrations plus `seed/2026-04-29_mock_data.sql`; base schema migration not found. |
| `omr-service/` | Standalone FastAPI service for OMR grading and AI report comments. | `main.py`, `requirements.txt`, `README.md`, `RUN-LOCAL.md`, `template.sample.json`. |
| `public/` | Static assets. | SMK logo, icons, OMR test HTML/template, default Next SVGs. |
| `types/` | Local type declarations. | `nodemailer.d.ts`. |
| `.env.local` | Local environment variables. | Values are not documented here; names only are listed below. |
| `next.config.ts` | Next image config and dev indicators. | Allows remote images from AlphaCoders and Unsplash. |
| `tailwind.config.ts` | Tailwind content and animation plugin. | Tailwind 4 is also configured through `app/globals.css`. |
| `components.json` | shadcn/ui configuration. | New York style, lucide icons, aliases. |

Folders requested but not present:

| Path | Status |
|---|---|
| `actions/` | Not found in current codebase. |
| `services/` | Not found in current codebase. |
| `middleware.ts` | Not found in current codebase. Route protection is done in layouts/API helpers. |
| `config/` | Not found in current codebase. |
| `styles/` | Not found in current codebase. Global CSS is in `app/globals.css`. |

---

# 4. Main Features

## Authentication and Session Handling

- Purpose: Login by role and protect pages/APIs.
- Status: In progress / functional but custom.
- Pages/routes: `/login`, root `/` redirects to `/login`.
- APIs/actions: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, `POST /api/auth/session-role`.
- Tables: `stg_students`, `stg_teachers`, `stg_admins`, `stg_teacher_roles`, `stg_roles`, `stg_sessions`.
- Notes: Uses signed HTTP-only cookie `stg_auth` plus client `localStorage` session mirror. Students log in with IC number only. Teacher/admin passwords use bcrypt. Teacher first-login password change is currently disabled in login flow but still partially exists in UI/API.

## Admin Dashboard and Master Data

- Purpose: Admin oversight and management of users, classes, subjects, exams, assignments, sessions, and system usage.
- Status: Mostly implemented.
- Pages/routes: `/admin/dashboard`, `/admin/users`, `/admin/teacher`, `/admin/student`, `/admin/classes`, `/admin/classes/[id]`, `/admin/subjects`, `/admin/exams`, `/admin/profile`, `/admin/assignments`, `/admin/reports`.
- APIs/actions: `app/api/admin/*`.
- Tables: `stg_admins`, `stg_teachers`, `stg_students`, `stg_classes`, `stg_subjects`, `stg_exams`, `stg_teacher_subject`, `stg_class_teachers`, `stg_subject_coordinators`, `stg_sessions`.
- Notes: `/admin/reports` appears minimal compared with other admin modules. `/admin/assignments` exists but is not active in sidebar config.

## Teacher Dashboard

- Purpose: Role-aware teacher landing page for class teacher and subject teacher workflows.
- Status: Implemented, large combined page with split components for class/subject teacher dashboards.
- Pages/routes: `/teacher/dashboard`, `class-teacher-dashboard.tsx`, `subject-teacher-dashboard.tsx`.
- APIs/actions: teacher assignment, class dashboard, exams, class summary, auth profile endpoints.
- Tables: `stg_teacher_subject`, `stg_class_teachers`, `stg_results`, `stg_students`, `stg_subjects`, `stg_exams`.

## Subject Mark Entry

- Purpose: Subject teachers enter manual and OMR component marks and submit/draft class results.
- Status: Implemented with template-based marking.
- Pages/routes: `/teacher/my-subject`.
- APIs/actions: `POST /api/teacher/marks`, `GET /api/teacher/marks/status`, `GET /api/teacher/component-marks`, `GET /api/teacher/objective-marks`, `GET /api/teacher/subjective-marks`, `GET /api/teacher/students`, `GET /api/teacher/assignments`.
- Tables: `stg_teacher_subject`, `stg_students`, `stg_exams`, `stg_subjects`, `stg_mark_components`, `stg_subjective_marks`, `stg_omr_scans`, `stg_results`.
- Notes: `lib/marking-template.ts` provides lower/upper form templates and subject presets. Approved marks are blocked from update unless rejected.

## OMR Scanning and Grading

- Purpose: Scan objective answer sheets and persist objective marks.
- Status: Implemented but dependent on external FastAPI service and calibrated templates.
- Pages/routes: `/teacher/omr`, `/teacher/omr/results`.
- APIs/actions: `GET /api/teacher/omr/template`, `POST /api/teacher/omr/grade`.
- External service: `POST /grade`, `POST /grade-file`, `GET /template/spm-80`, `GET /demo`, `GET /health` in `omr-service/main.py`.
- Tables: `stg_answer_schema`, `stg_omr_scans`, `stg_omr_scan_answers`, `stg_mark_components`, `stg_results`.
- Notes: Results page reads last result from `sessionStorage`. The app also includes `public/omr-test-a4.html` and `public/omr-test-template-10q.json`.

## Subject Coordinator Management

- Purpose: Manage subject teacher assignments, answer schemes, exam subject settings, approvals, and reports for coordinated subjects.
- Status: Implemented / in progress.
- Pages/routes: `/coordinator/dashboard`, `/coordinator/assignments`, `/coordinator/answer-schemes`, `/coordinator/approvals`, `/coordinator/reports`.
- APIs/actions: `GET /api/coordinator/dashboard`, `GET/POST /api/coordinator/teacher-subject`, `GET/POST /api/coordinator/answer-schemes`, `POST /api/coordinator/exam-subject-settings`, `GET/POST /api/coordinator/approvals`, `GET /api/coordinator/reports`, `GET /api/coordinator/subjects`.
- Tables: `stg_subject_coordinators`, `stg_teacher_subject`, `stg_answer_schema`, `stg_exams.subject_settings`, `stg_results`, `stg_subjective_marks`, `stg_mark_components`.
- Notes: Coordinator reports include a hard-coded message/path around Mathematics if not found, which should be generalized.

## Approval Workflow

- Purpose: Subject coordinators review submitted marks and approve or reject them before report cards are generated.
- Status: Implemented with complex grouping logic.
- Pages/routes: `/coordinator/approvals`.
- APIs/actions: `GET /api/coordinator/approvals`, `POST /api/coordinator/approvals`.
- Tables: `stg_results`, `stg_subjective_marks`, `stg_mark_components`, `stg_omr_scans`, `stg_students`, `stg_classes`, `stg_subjects`, `stg_exams`, `stg_teachers`.
- Notes: Handles orphan subjective marks and synthetic rejected results. Logic is high-value but dense.

## Report Cards and AI Comments

- Purpose: Class teachers generate student report cards and add manual or AI-generated comments.
- Status: Implemented with AI fallback.
- Pages/routes: `/teacher/report`, `/student/report-card`, `/student/dashboard`.
- APIs/actions: `POST /api/teacher/report-cards/generate`, `GET /api/teacher/report-cards/class`, `POST /api/teacher/report-cards/comment`, `GET /api/student/report-card`.
- External service: `POST /report-comment` in OMR FastAPI service, optionally backed by JamAI.
- Tables: `stg_report_cards`, `stg_results`, `stg_students`, `stg_classes`, `stg_teachers`, `stg_exams`, `stg_subjects`.
- Notes: AI comments use `REPORT_AI_SERVICE_URL` if present, otherwise `OMR_SERVICE_URL`, otherwise localhost. If JamAI is not configured, FastAPI returns a local fallback comment.

## Student Views

- Purpose: Student dashboard, report card, performance trend, and profile.
- Status: Partially implemented.
- Pages/routes: `/student/dashboard`, `/student/report-card`, `/student/my-results`, `/student/profile`.
- APIs/actions: `GET /api/student/report-card`, `GET /api/student/performance-trend`, `POST /api/auth/me`.
- Tables: `stg_students`, `stg_results`, `stg_report_cards`, `stg_exams`, `stg_subjects`, `stg_classes`.
- Notes: `/api/student` is only a health-like stub returning `"student api ok"`.

## Principal Views

- Purpose: School leadership overview and class teacher assignment.
- Status: Implemented / new.
- Pages/routes: `/principal/dashboard`, `/principal/class-teachers`.
- APIs/actions: `GET /api/principal/dashboard`, `GET /api/principal/class-teachers`, plus shared admin class-teacher API allows `admin` or `principal`.
- Tables: `stg_results`, `stg_students`, `stg_classes`, `stg_subjects`, `stg_exams`, `stg_class_teachers`, `stg_teachers`.

## Profile and Settings

- Purpose: View profile data and change passwords/theme accents.
- Status: Partial.
- Pages/routes: `/admin/profile`, `/teacher/profile`, `/student/profile`.
- APIs/actions: `POST /api/auth/me`, `POST /api/auth/change-password`.
- Tables: `stg_admins`, `stg_teachers`, `stg_students`.
- Notes: Student password change exists in API but student login does not use password.

## Help Page

- Purpose: Help/documentation page.
- Status: Placeholder.
- Pages/routes: `/help`.
- Notes: Page says help content is not prepared.

---

# 5. Module Progress Tracker

| Module | Status | Completion | Notes |
|---|---|---:|---|
| Authentication | In Progress | 75% | Custom signed cookie auth works across layouts/APIs; localStorage mirror and disabled first-login flow create consistency/security concerns. |
| Authorization / RBAC | In Progress | 78% | `requirePageRole` and `requireApiRole` are broadly used; no middleware; some routes rely on role plus request IDs. |
| Admin Panel | In Progress | 82% | Major CRUD pages exist for teachers, students, classes, subjects, exams, and sessions. Reports/assignments are less complete or not active in sidebar. |
| User Management | In Progress | 80% | Teacher/student/admin management exists; admin email reset unsupported due to missing email column. |
| Class Management | In Progress | 86% | Class CRUD, detail page, class teacher assignment, student counts and teacher assignment flows exist. |
| Subject Management | In Progress | 84% | Subject CRUD and subject coordinator assignment exist. |
| Exam Management | In Progress | 82% | Exam CRUD and subject settings exist; settings stored in JSONB on `stg_exams`. |
| Teacher Assignment | In Progress | 84% | Admin and coordinator assignment routes/pages exist; some assignment features are duplicated across admin/coordinator/principal. |
| Teacher Dashboard | In Progress | 82% | Large implemented dashboard with class/subject modes; complexity is concentrated in one page. |
| Mark Entry | In Progress | 88% | Draft/final submission, component templates, grade calculation, and approval lockout are implemented. |
| OMR System | In Progress | 78% | End-to-end grading path exists with FastAPI/OpenCV; production readiness depends on template calibration, service deployment, and error handling. |
| Answer Scheme Management | In Progress | 82% | Coordinator can manage answer schemes by exam/subject/grade group; relies on `stg_answer_schema`. |
| Approval Workflow | In Progress | 86% | Coordinator review/approve/reject is implemented with dense but functional server logic. |
| Report Cards | In Progress | 84% | Class report generation, comments, student viewing, and approved-result checks are present. |
| AI Report Comments | Partial | 65% | JamAI integration exists in OMR service with fallback; env docs are incomplete and service is coupled through OMR URL by default. |
| Student Portal | Partial | 68% | Dashboard/report card/trend pages exist; profile is minimal and student auth is IC-only. |
| Principal Portal | In Progress | 74% | Dashboard and class teacher assignment exist; module is newer and narrower than admin/teacher areas. |
| Analytics | Partial | 45% | Charts exist; teacher analytics page is minimal, while dashboards/reports contain embedded analytics. |
| Notifications | Partial | 45% | Sonner toasts are used client-side; no persistent notification system found. |
| File Upload | Partial | 50% | OMR image upload/preview is implemented through base64/service call; no storage service or upload persistence found. |
| Database | Partial | 60% | Many tables are used and incremental migrations exist; complete base schema migration is not found in current codebase. |
| API Layer | In Progress | 80% | Many route handlers are implemented; validation and response shape consistency need improvement. |
| UI Components | In Progress | 82% | shadcn/ui components and app shell are established; several pages are very large. |
| Mobile Responsiveness | Partial | 65% | Sidebar/layout and `use-mobile` exist; many dense tables/forms need dedicated mobile QA. |
| Deployment | Partial | 40% | Next README suggests Vercel; OMR service has local run docs. No production deployment config or CI found. |
| Testing | Planned | 5% | No test framework, test files, or CI test command found. |
| Security | In Progress | 60% | HTTP-only signed cookie and bcrypt are good; student IC-only login, localStorage session dependency, missing rate limiting, and service role usage need review. |

---

# 6. App Flow / User Flow

## Authentication Flow

1. User opens `/`; `app/page.tsx` redirects to `/login`.
2. Login page shows tabs for student, teacher, and admin.
3. Student logs in with `ic_number`; teacher logs in with username/password; admin logs in with admin ID/password.
4. `POST /api/auth/login` verifies credentials against Supabase tables.
5. Successful login creates a `stg_sessions` row and sets signed HTTP-only cookie `stg_auth`.
6. Client also stores a `stg_session` object in `localStorage`.
7. User is routed by role:
   - admin -> `/admin/dashboard`
   - principal teacher role -> `/principal/dashboard`
   - subject coordinator -> `/coordinator/dashboard`
   - other teacher -> `/teacher/dashboard`
   - student -> `/student/dashboard`
8. Role layouts call `requirePageRole` server-side.
9. API routes call `requireApiRole` or `requireApiSession`.

## Onboarding / First Login Flow

1. Teacher rows include `is_first_login`.
2. Password change UI and API still support first-login logic.
3. Current login code explicitly disables first-login enforcement and returns `must_change_password: false`.
4. Therefore a real forced onboarding flow is not active.

## Dashboard Flow

1. Role layout renders `AppSidebar`, `SiteHeader`, and `SystemFooter`.
2. `AppSidebar` reads `localStorage.stg_session`, calls `POST /api/auth/me`, and builds role-specific navigation from `lib/sidebar-config.ts`.
3. Dashboard pages fetch role-specific API data.
4. Users navigate into CRUD, marking, approval, reporting, or student views based on role.

## Admin Flow

1. Admin logs in and enters `/admin/dashboard`.
2. Admin manages teachers, students, classes, subjects, and exams.
3. Teacher role assignments are stored through `stg_teacher_roles`.
4. Class teacher assignments use `stg_class_teachers`.
5. Subject coordinator assignments use `stg_subject_coordinators`.
6. Subject teacher/class assignments use `stg_teacher_subject`.
7. Admin can inspect sessions/system usage through `stg_sessions`.

## Teacher Marking Flow

1. Teacher selects class, subject, and exam from assigned `stg_teacher_subject` rows.
2. Page loads students, existing component marks, objective marks, subjective marks, and mark status.
3. Mark template is derived from `stg_exams.subject_settings` and `lib/marking-template.ts`.
4. Teacher saves a draft or submits final marks through `POST /api/teacher/marks`.
5. Server writes `stg_mark_components`, `stg_subjective_marks`, `stg_omr_scans` when needed, and `stg_results`.
6. Submitted results default to `pending` for coordinator approval.

## OMR Upload / Processing Flow

1. Teacher opens `/teacher/omr`.
2. App loads assignments, exams, students, and a template from `GET /api/teacher/omr/template`.
3. Teacher uploads/captures an image.
4. `POST /api/teacher/omr/grade` verifies assignment, loads answer schema, and calls FastAPI `POST /grade`.
5. FastAPI detects sheet corners, warps image, reads bubbles, compares with answer key, and returns per-question results.
6. Next API stores scan totals, optional per-question answers, component marks, and updates/creates `stg_results`.
7. Client stores last OMR result in `sessionStorage` for `/teacher/omr/results`.

## Coordinator Approval Flow

1. Coordinator logs in with teacher role `subject coordinator`.
2. Coordinator sees subjects from `stg_subject_coordinators`.
3. Coordinator reviews teacher submissions in `/coordinator/approvals`.
4. `GET /api/coordinator/approvals` groups `stg_results` by subject/class/exam/teacher.
5. Coordinator approves or rejects with `POST /api/coordinator/approvals`.
6. Result rows are updated to `approved` or `rejected`; approved marks can then feed report cards.

## Report Card Flow

1. Class teacher opens `/teacher/report`.
2. Teacher loads class, exam, result, and report card data.
3. `POST /api/teacher/report-cards/generate` generates cards only after required results are approved.
4. Teacher adds manual or AI comments through `POST /api/teacher/report-cards/comment`.
5. Report cards are stored in `stg_report_cards`.
6. Student views generated report card through `/student/report-card`.

## AI Processing Flow

1. Teacher chooses AI comment mode from report card workflow.
2. Next API builds a structured Bahasa Melayu prompt payload from student, class, exam, and performance data.
3. Next API calls `${REPORT_AI_SERVICE_URL || OMR_SERVICE_URL || "http://127.0.0.1:8001"}/report-comment`.
4. FastAPI uses JamAI if `JAMAI_PROJECT_ID` and `JAMAI_PAT` are configured.
5. If JamAI is unavailable, FastAPI generates a deterministic fallback comment.

---

# 7. Database / Data Model

Database provider: Supabase PostgreSQL.

ORM: Not found in current codebase. Database access is direct via `supabase.from(...)` calls.

Schema management:

| Location | Purpose |
|---|---|
| `db/migrations/2026-04-23_stg_exams_subject_settings.sql` | Adds `stg_exams.subject_settings jsonb`. |
| `db/migrations/2026-04-23_stg_student_class_history.sql` | Creates optional class history table. |
| `db/migrations/2026-04-29_stg_omr_scan_answers.sql` | Creates per-question OMR answer table. |
| `db/migrations/2026-05-06_report_card_comment_mode.sql` | Adds report card prompt/comment mode fields and unique index. |
| `db/migrations/2026-05-09_uppercase_student_fullname.sql` | One-time uppercase name cleanup. |
| `db/migrations/2026-05-17_stg_answer_schema_grade_group.sql` | Adds answer schema grade group and index. |
| `db/migrations/2026-05-17_stg_mark_components.sql` | Creates component-level mark storage. |
| `db/seed/2026-04-29_mock_data.sql` | Inserts sample roles, users, classes, subjects, exams, results, report cards, sessions. |

Important issue: base table creation migrations for core tables like `stg_students`, `stg_teachers`, `stg_classes`, `stg_subjects`, `stg_exams`, `stg_results`, and others are not found in current codebase. The seed and app assume they already exist.

## Tables Used

| Table | Purpose | Important columns found in code | Relationships / notes |
|---|---|---|---|
| `stg_admins` | Admin accounts. | `admin_id`, `username`, `password`, `fullname`. | Used for admin login/profile. No email column found; admin email reset unsupported. |
| `stg_teachers` | Teacher accounts. | `teacher_id`, `username`, `password`, `fullname`, `email`, `phone_number`, `status`, `is_first_login`. | Linked to roles, class teacher, subject coordinator, subject assignments. |
| `stg_students` | Student records. | `student_id`, `class_id`, `ic_number`, `fullname`, `status`, `created_at`, `password`, `enrollment_date`, `level`. | Student login uses `ic_number`; linked to class, results, report cards. |
| `stg_roles` | Teacher role definitions. | `role_id`, `role_name`. | Seed includes `class teacher`, `subject teacher`, `subject coordinator`, `principal`. |
| `stg_teacher_roles` | Teacher-role join table. | `teacher_roles_id`, `teacher_id`, `role_id`. | Determines teacher navigation and authorization. |
| `stg_classes` | Class master data. | `class_id`, `class_name`, `grade`. | Linked to students, class teachers, assignments, report cards. |
| `stg_subjects` | Subject master data. | `subject_id`, `subject_name`. | Linked to exams, assignments, results, answer schemes. |
| `stg_class_teachers` | Class teacher assignment. | `class_teacher_id`, `class_id`, `teacher_id`, `created_at`. | Admin/principal can assign; class teacher features depend on it. |
| `stg_subject_coordinators` | Subject coordinator assignment. | `subject_coordinator_id`, `subject_id`, `teacher_id`, `created_at`. | Coordinator scope is determined here. |
| `stg_teacher_subject` | Subject teacher assignments. | `teacher_subject_id`, `teacher_id`, `subject_id`, `class_id`. | Subject teacher mark entry and OMR access depend on it. |
| `stg_exams` | Exam definitions and subject settings. | `exam_id`, `exam_name`, `academic_year`, `subject_settings`. | `subject_settings` stores deadlines, objective/subjective settings, and grade templates as JSONB. |
| `stg_answer_schema` | Objective answer keys. | `schema_id`, `exam_id`, `subject_id`, `question_no`, `correct_answer`, `grade_group`. | Used by OMR template/grade routes; indexed by exam/subject/grade group/question. |
| `stg_omr_scans` | Objective scan totals. | `omr_scan_id`, `student_id`, `subject_id`, `exam_id`, `objective_total_mark`, `scan_date`. | Linked to `stg_results` and optional answer details. |
| `stg_omr_scan_answers` | Per-question OMR detection results. | `answer_id`, `omr_scan_id`, `question_no`, `detected_option`, `expected_option`, `status`, `confidence`, `ratios`. | FK to `stg_omr_scans`, unique `(omr_scan_id, question_no)`. |
| `stg_subjective_marks` | Manual/subjective mark totals. | `subjective_id`, `teacher_id`, `student_id`, `subject_id`, `exam_id`, `subjective_mark`, `input_date`. | Linked to results and approval workflow. |
| `stg_mark_components` | Component-level marks. | `mark_component_id`, `student_id`, `subject_id`, `exam_id`, `class_id`, `teacher_id`, `component_key`, `component_label`, `component_type`, `mark`, `max_mark`, `included_in_total`, `question_count`, `group_name`, `input_date`. | Unique `(student_id, subject_id, exam_id, component_key)`. |
| `stg_results` | Final/pending subject result rows. | `result_id`, `student_id`, `subject_id`, `exam_id`, `omr_scan_id`, `subjective_id`, `total`, `grade`, `status`, `approval_date`. | Status is treated as `pending`, `approved`, or `rejected`. |
| `stg_report_cards` | Generated student report cards. | `report_card_id`, `student_id`, `class_id`, `teacher_id`, `exam_id`, `average_mark`, `class_position`, `ai_comment`, `generated_date`, `prompt_input`, `comment_mode`. | Unique index on `(student_id, exam_id)` added by migration. |
| `stg_sessions` | Login/logout audit. | `session_id`, `user_id`, `user_name`, `role`, `action`, `login_time`, `logout_time`. | Created on login, updated on logout, used by admin usage views. |
| `stg_student_class_history` | Optional class history. | `history_id`, `student_id`, `class_id`, `level`, `start_date`, `end_date`, `created_at`. | FK to students/classes. |
| `stg_users` | Sandbox/general users. | `id`, `username`, `password_hash`, `created_at`. | Seed inserts one row; no meaningful app usage found. |

Enums / constraints visible:

| Item | Values / Constraint |
|---|---|
| App roles | `admin`, `teacher`, `student`, `principal` plus teacher role names. |
| Result status | Code expects `pending`, `approved`, `rejected`. |
| Mark component type | DB check: `manual`, `omr`. |
| OMR answer options | Service validates `A`, `B`, `C`, `D`. |

---

# 8. API / Server Actions

No Next.js server actions were found. The backend is implemented as Route Handlers under `app/api`.

## Auth APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login student/teacher/admin, create session log, set cookie. | Public. |
| POST | `/api/auth/logout` | Update session logout time and clear cookie. | Requires `session_id` in body; does not call `requireApiSession`. |
| POST | `/api/auth/me` | Return current profile based on signed cookie session. | Session cookie required. |
| POST | `/api/auth/change-password` | Change password for teacher/admin/student. | `requireApiSession`. |
| POST | `/api/auth/forgot-password` | Reset teacher password and send temporary password email. | Public; teacher only effectively supported. |
| POST | `/api/auth/session-role` | Switch active teacher role in cookie. | Session cookie required; teacher only. |

## Admin APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/users?role=` | List users by role. | Admin. |
| POST | `/api/admin/teacher` | Create teacher. | Admin. |
| PUT, DELETE | `/api/admin/teacher/[id]` | Update/delete teacher. | Admin. |
| GET, POST, PUT, DELETE | `/api/admin/students` | Student CRUD. | Admin. |
| POST | `/api/admin/students/recalculate-levels` | Recalculate student levels. | Admin. |
| GET, POST, PUT, DELETE | `/api/admin/classes` | Class CRUD. | Admin. |
| GET | `/api/admin/classes/[id]` | Get class detail. | Admin. |
| GET, POST, DELETE | `/api/admin/class-teacher` | Manage class teacher assignments. | Admin or principal. |
| GET, POST, PUT, DELETE | `/api/admin/subjects` | Subject CRUD. | Admin. |
| GET, POST, DELETE | `/api/admin/subject-coordinator` | Manage subject coordinator assignments. | Admin. |
| GET, POST, DELETE | `/api/admin/teacher-subject` | Manage teacher-subject-class assignments. | Admin. |
| GET, POST, PUT, DELETE | `/api/admin/exams` | Exam CRUD and settings updates. | GET allows admin/teacher; write requires admin. |
| GET | `/api/admin/session` | Current admin session info. | Admin. |
| GET | `/api/admin/sessions` | Session audit list. | Admin. |
| GET | `/api/admin/system-usage` | Usage metrics by range. | Admin. |

## Teacher APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/teacher/assignments` | List teacher assignments. | Teacher. |
| GET | `/api/teacher/students` | List students for assigned class. | Teacher. |
| GET | `/api/teacher/exams` | List exams. | Teacher. |
| POST | `/api/teacher/marks` | Save draft or submit component marks/results. | Teacher. |
| GET | `/api/teacher/marks/status` | Check mark approval/submission status. | Teacher. |
| GET | `/api/teacher/component-marks` | Get saved component marks. | Teacher. |
| GET | `/api/teacher/objective-marks` | Get OMR/objective marks. | Teacher. |
| GET | `/api/teacher/subjective-marks` | Get subjective/manual marks. | Teacher. |
| GET | `/api/teacher/class-teacher` | Get class teacher assignment info. | Teacher. |
| POST | `/api/teacher/class-teacher` | Class teacher related update. | Teacher. |
| GET | `/api/teacher/class-dashboard` | Class teacher dashboard data. | Teacher. |
| GET | `/api/teacher/class-summary` | Class/subject summary data. | Teacher. |
| GET | `/api/teacher/available-students` | Students available for class assignment. | Class teacher. |
| POST | `/api/teacher/my-class/add` | Add students to own class. | Class teacher. |
| DELETE | `/api/teacher/my-class/remove` | Remove student from own class. | Class teacher. |
| GET | `/api/teacher/subject-teacher` | Subject teacher info. | Teacher. |
| GET | `/api/teacher/omr/template` | Build/load OMR template and answer key. | Teacher. |
| POST | `/api/teacher/omr/grade` | Call OMR service and persist scan/results. | Teacher. |
| POST | `/api/teacher/report-cards/generate` | Generate report cards for class/exam. | Teacher. |
| GET | `/api/teacher/report-cards/class` | Fetch class report cards/results. | Teacher. |
| POST | `/api/teacher/report-cards/comment` | Save manual or AI report card comment. | Teacher. |

## Coordinator APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/coordinator/subjects` | List subjects coordinated by teacher. | Subject coordinator. |
| GET | `/api/coordinator/dashboard` | Coordinator dashboard metrics. | Subject coordinator. |
| GET, POST | `/api/coordinator/teacher-subject` | View/update subject teacher assignments. | Subject coordinator. |
| GET, POST | `/api/coordinator/answer-schemes` | Read/write answer schemes. | Subject coordinator. |
| POST | `/api/coordinator/exam-subject-settings` | Update exam subject marking settings. | Subject coordinator. |
| GET, POST | `/api/coordinator/approvals` | List approval submissions and approve/reject. | Subject coordinator. |
| GET | `/api/coordinator/reports` | Coordinator report metrics. | Subject coordinator. |

## Principal APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/principal/dashboard` | Principal overview metrics and filters. | Principal. |
| GET | `/api/principal/class-teachers` | Class teacher assignment overview. | Principal. |

## Student APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/student` | Stub health response. | Public / no auth found. |
| GET | `/api/student/report-card` | Current student report card. | Student. |
| GET | `/api/student/performance-trend` | Current student performance trend. | Student. |

## OMR FastAPI Service

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Health check. | None. |
| POST | `/grade` | Grade base64 OMR image. | None at service layer. |
| POST | `/grade-file` | Grade multipart uploaded OMR image. | None at service layer. |
| GET | `/template/spm-80` | Return built-in SPM-style 80-question template. | None. |
| POST | `/report-comment` | Generate AI/fallback report card comment. | None at service layer. |
| GET | `/demo` | Manual upload test page. | None. |

Validation logic:

- Most route handlers manually parse `req.json()` or `searchParams`.
- `zod` is installed but not used for API request validation.
- OMR FastAPI service uses Pydantic models for request validation.

Middleware:

- `middleware.ts` not found in current codebase.
- Page protection is done in role layouts.
- API protection is done in route handlers using helpers from `lib/auth.ts`.

---

# 9. Authentication & Authorization

Auth provider: custom application auth, not Supabase Auth.

Session management:

- Server session cookie name: `stg_auth`.
- Cookie is HTTP-only, `sameSite: "lax"`, `secure` in production.
- Cookie payload is base64url JSON plus HMAC SHA-256 signature.
- TTL is 4 hours.
- Session secret comes from `STG_SESSION_SECRET`; in non-production it falls back to `EMAIL_PASS` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Client mirrors session data in `localStorage.stg_session` for navigation/sidebar behavior.

Protected routes:

- `app/admin/layout.tsx` requires `admin`.
- `app/teacher/layout.tsx` allows `class teacher`, `subject teacher`, `subject coordinator`, `principal`.
- `app/coordinator/layout.tsx` requires `subject coordinator`.
- `app/student/layout.tsx` requires `student`.
- `app/principal/layout.tsx` requires `principal`.

Role-based access:

- `requireApiRole(allowedRoles)` checks session `userType`, active `role`, and `roles`.
- Teacher role switching uses `/api/auth/session-role`.
- Sidebar navigation is role-aware through `lib/sidebar-config.ts`.

Admin restrictions:

- Most `/api/admin/*` routes require `admin`.
- `/api/admin/class-teacher` also allows `principal`.
- `GET /api/admin/exams` allows `admin` and `teacher`; write operations require `admin`.

Security concerns found:

| Concern | Evidence / Risk |
|---|---|
| Student login is IC-only | `POST /api/auth/login` authenticates students by `ic_number` and status only. |
| Client-side localStorage session is required by shell | Sidebar/profile pages depend on `localStorage.stg_session`; this can drift from signed cookie. |
| No rate limiting found | Login and forgot-password endpoints are public and not rate-limited in code. |
| Development secret fallback may use public anon key | `lib/auth.ts` falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if `STG_SESSION_SECRET` is absent outside production. |
| Forgot password sends temporary password by email | Teacher temporary password is emailed and `is_first_login` is set true, but login currently disables first-login password change enforcement. |
| Service role key used in several APIs | `supabaseAdmin` bypasses RLS; route guards must be correct everywhere. |
| OMR/FastAPI service has no service-layer auth | Next.js guards calls, but direct network exposure would allow unauthenticated grading/comment calls. |
| No CSRF-specific protection found | Cookie auth uses `sameSite: lax`; no CSRF token pattern found. |

---

# 10. UI / Styling System

| Area | Implementation |
|---|---|
| Styling engine | Tailwind CSS 4 through `@import "tailwindcss"` in `app/globals.css`. |
| Design primitives | shadcn/ui-style components in `components/ui/`. |
| Theme tokens | CSS variables in `:root` and `.dark`; `@theme inline` maps variables to Tailwind tokens. |
| Dark mode | `next-themes`, `ThemeProvider`, `ModeToggle`, and keyboard `d` toggle. |
| Typography | Google Poppins in `app/layout.tsx`; CSS variables also define Inter/JetBrains/Georgia. |
| Layout | Role layouts share `SidebarProvider`, `AppSidebar`, `SiteHeader`, and `SystemFooter`. |
| Navigation | Sidebar config is centralized in `lib/sidebar-config.ts`. |
| Icons | lucide-react used heavily; react-icons used for teacher icon; Tabler installed. |
| Data display | Tables, cards, badges, charts, tabs, dialogs, selects. |
| Responsiveness | Sidebar supports collapsible behavior; pages use responsive Tailwind classes. Dense tables/forms still require mobile QA. |
| Animations | `tailwindcss-animate`, `tw-animate-css`, Radix/shadcn transitions. |

Notable styling issues:

- `app/globals.css` sets `* { font-size: 14px; }`, which can reduce semantic typography scalability and accessibility.
- CSS contains duplicate `body` and `.dark` blocks.
- Palette is heavily purple/blue-oriented.
- Some large pages contain extensive inline UI logic and could benefit from component extraction.

---

# 11. Environment Variables

Values are intentionally omitted.

## Frontend / App

| Variable | Purpose | Found |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | Public app base URL, likely used for absolute links. | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, also exposed to client. | `.env.local`, `lib/supabase.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key, also exposed to client. | `.env.local`, `lib/supabase.ts` |

## Backend / Auth

| Variable | Purpose | Found |
|---|---|---|
| `STG_SESSION_SECRET` | HMAC secret for signed session cookies. Required in production by `lib/auth.ts`. | Referenced in code; not present in `.env.local` name list. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for privileged database operations. | `.env.local`, `lib/supabase-admin.ts` |

## Email

| Variable | Purpose | Found |
|---|---|---|
| `EMAIL_USER` | Gmail sender account for forgot-password email. | `.env.local` |
| `EMAIL_PASS` | Gmail app password / SMTP password. Also used as development session-secret fallback. | `.env.local` |

## OMR / AI Services

| Variable | Purpose | Found |
|---|---|---|
| `OMR_SERVICE_URL` | Base URL for FastAPI OMR service; used for `/grade` and as fallback for `/report-comment`. | `.env.local`, docs, route handlers |
| `REPORT_AI_SERVICE_URL` | Optional separate report comment service URL. | Referenced in `app/api/teacher/report-cards/comment/route.ts`; not in `.env.local` name list. |
| `JAMAI_PROJECT_ID` | JamAI project ID for FastAPI AI comments. | Referenced in `omr-service/main.py`. |
| `JAMAI_PAT` | JamAI personal access token. | Referenced in `omr-service/main.py`. |
| `JAMAI_SYMPTOM_TABLE_ID` | JamAI table ID env name used for report comments, defaulting to `std_report`. | Referenced in `omr-service/main.py`; name appears mismatched with report-comment purpose. |

## Storage / Analytics / Deployment

| Category | Status |
|---|---|
| Storage service variables | Not found in current codebase. |
| Analytics service variables | Not found in current codebase. |
| Deployment-specific variables | Not found beyond standard app/service env needs. |

---

# 12. Setup Instructions

## Prerequisites

- Node.js compatible with Next.js 16.
- npm, because `package-lock.json` is present.
- Supabase project with required `stg_*` tables.
- Python 3.12 for the OMR service.

## Install Next.js App

```bash
npm install
```

## Configure Environment

Create `.env.local` with the required variable names listed above. Do not commit secrets.

Recommended minimum for app:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STG_SESSION_SECRET=
EMAIL_USER=
EMAIL_PASS=
OMR_SERVICE_URL=http://127.0.0.1:8001
```

## Database Setup

1. Create the base Supabase schema for all `stg_*` tables.
2. Apply migrations in `db/migrations/`.
3. Optionally load `db/seed/2026-04-29_mock_data.sql` for mock data.

Important: base schema creation SQL is not found in current codebase. Existing migrations are incremental and assume core tables already exist.

## Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

## Start Production Build

```bash
npm run start
```

## Lint

```bash
npm run lint
```

## OMR Service Setup

```powershell
cd omr-service
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Health check:

```bash
curl http://127.0.0.1:8001/health
```

Useful service URLs:

```text
http://127.0.0.1:8001/demo
http://127.0.0.1:8001/docs
```

## Deployment

Next.js:

- README suggests Vercel as the intended/default deployment target.
- Configure the same environment variables in the deployment platform.
- Ensure server runtime supports Node.js route handlers and bcrypt/nodemailer usage.

OMR service:

- Deploy separately as a Python FastAPI service.
- Configure `OMR_SERVICE_URL` in the Next.js app to point to the deployed service.
- If exposed publicly, add service-level authentication or network restrictions.

CI/CD:

- Not found in current codebase.

---

# 13. Current Issues / Technical Debt

| Area | Issue | Evidence |
|---|---|---|
| Database schema | Base schema migrations are missing. | `db/migrations` only contains incremental alters/new tables; seed assumes many existing tables. |
| Auth security | Student login uses IC number only. | `app/api/auth/login/route.ts` student branch. |
| Session consistency | App uses both signed cookie and `localStorage.stg_session`. | `lib/auth.ts`, `components/app-sidebar.tsx`, login form. |
| First-login flow | Teacher first-login password change is partially present but disabled. | `app/login/login-form.tsx`, `/api/auth/login`, `/api/auth/change-password`. |
| Validation | APIs mostly use manual string parsing and checks. | Many `req.json()` and `searchParams` handlers; `zod` not used in APIs. |
| Testing | No tests found. | No test scripts/framework/files. |
| Middleware | No central `middleware.ts`. | Page/API guards are repeated in layouts/handlers. |
| Large files | Several pages and routes are very large. | `teacher/report/page.tsx` ~1757 lines, `teacher/dashboard/page.tsx` ~1620 lines, `admin/classes/page.tsx` ~1259 lines, `coordinator/approvals/page.tsx` ~990 lines. |
| Duplicated domain logic | Assignment and class teacher flows appear in admin, coordinator, teacher, and principal areas. | Shared tables/routes with overlapping page logic. |
| API consistency | Response shapes vary between `{ data }`, `{ success }`, `{ message }`, and mixed statuses. | Route handlers across `app/api`. |
| Service coupling | AI report comments are routed through OMR service fallback URL. | `REPORT_AI_SERVICE_URL || OMR_SERVICE_URL`. |
| OMR persistence | OMR result details page depends on `sessionStorage`. | `/teacher/omr/results`. |
| Placeholder pages | Help and teacher analytics are minimal. | `app/help/page.tsx`, `app/teacher/analytics/page.tsx`. |
| Hard-coded report logic | Coordinator reports mention a specific Mathematics subject if missing. | `app/api/coordinator/reports/route.ts`. |
| Environment docs | Referenced variables are incomplete in local env list. | `STG_SESSION_SECRET`, `REPORT_AI_SERVICE_URL`, `JAMAI_*` not all present in `.env.local` names. |
| Styling | Global `* { font-size: 14px; }` affects all text. | `app/globals.css`. |
| Encoding artifacts | Some comments/toast strings show mojibake characters. | Seen in login/sidebar/OMR service comments. |
| Rate limiting | Login and forgot-password endpoints have no rate limiting found. | Public auth routes. |
| OMR service security | FastAPI endpoints have no auth. | `omr-service/main.py`. |
| Unused/default assets | Default Next SVG assets remain. | `public/file.svg`, `public/globe.svg`, `public/next.svg`, etc. |

---

# 14. Suggested Improvements

## High Priority

| Area | Improvement |
|---|---|
| Security | Require `STG_SESSION_SECRET` in all environments and remove public-key fallback. |
| Security | Replace student IC-only login with password/PIN/OTP or another verified credential. |
| Security | Add rate limiting and audit logging for login and forgot-password. |
| Security | Add service authentication or private networking for the OMR/FastAPI service. |
| Database | Add complete base schema migration and document migration order. |
| Validation | Introduce shared Zod schemas for all API request bodies/query params. |
| Auth consistency | Make signed cookie the source of truth and reduce reliance on mutable `localStorage`. |
| Testing | Add basic API tests for auth, marks, approvals, OMR persistence, and report card generation. |

## Medium Priority

| Area | Improvement |
|---|---|
| Architecture | Extract large pages into feature components and hooks. |
| API design | Standardize response envelopes and error handling. |
| Marking workflow | Move grade calculation/status transitions into shared service functions. |
| Report comments | Split AI comment service config from OMR grading service config. |
| Coordinator reports | Remove hard-coded Mathematics assumption and make report filters subject-agnostic. |
| Deployment | Add production runbook for Next.js + FastAPI + Supabase. |
| Observability | Add structured server logging and user-action audit events beyond login/logout. |
| UX | Persist OMR result history in database instead of relying only on session storage. |

## Low Priority

| Area | Improvement |
|---|---|
| UI | Remove global universal font-size rule and rely on design tokens/classes. |
| UI | Clean duplicate CSS blocks and encoding artifacts. |
| DX | Add `.env.example`. |
| DX | Add route/API documentation generated from route metadata. |
| Cleanup | Remove unused default Next assets if not needed. |
| Accessibility | Run keyboard/screen-reader review for dialogs, tables, and dense forms. |

---

# 15. Development Roadmap

## Phase 1 — Critical Stabilization

Fix:

- Add complete base schema migration.
- Require `STG_SESSION_SECRET` locally and in production.
- Harden student authentication beyond IC-only login.
- Add rate limiting for login/forgot-password.
- Protect or isolate the FastAPI OMR service.
- Decide and implement first-login password policy consistently.
- Add API validation for high-risk endpoints: login, password change, mark submission, approvals, OMR grade, report card generation.
- Add smoke tests for critical workflows.

## Phase 2 — Structure & Maintainability

Improve:

- Extract large route/page logic into feature modules or service helpers.
- Centralize grade calculation, result status transitions, and report card calculations.
- Standardize API responses and error handling.
- Add `.env.example` and setup checklist.
- Split OMR service concerns from AI report comment concerns.
- Move repeated assignment/class/subject lookup code into shared utilities.
- Add typed database models or generated Supabase types.

## Phase 3 — Feature Expansion

Add:

- Persistent notification system for approval/rejection events.
- Student secure password/account management if students need self-service login.
- Better OMR scan history, reprocessing, and manual correction workflow.
- Full teacher analytics page.
- Better principal analytics and exportable reports.
- Audit trail for mark edits, approvals, and report card generation.
- Admin report module completion.

## Phase 4 — Production Readiness

Prepare:

- CI/CD pipeline with lint, type-check, tests, and build.
- Production deployment configs for Next.js and FastAPI.
- Monitoring, error tracking, and structured logs.
- Database backup/restore and migration rollback plan.
- Supabase RLS review or explicit service-role-only architecture documentation.
- Load/performance testing for large classes/exams.
- Accessibility and mobile regression testing.
- Security review for auth, password reset, API authorization, and service-to-service calls.

---

# 16. Overall Project Assessment

| Category | Assessment |
|---|---|
| Architecture quality score | 7/10 for a school prototype; 6/10 for production without refactoring. |
| Scalability assessment | Moderate. Supabase and separated FastAPI service are good foundations, but large pages/routes and repeated query logic will become harder to scale. |
| Maintainability assessment | Moderate. Clear folder-by-role structure exists, but large files, manual validation, and missing base schema docs increase maintenance cost. |
| Production readiness estimate | 60-65%. Core workflows exist, but auth hardening, tests, schema completeness, deployment docs, and service security are needed first. |

Biggest strengths:

- Broad end-to-end role coverage across admin, teacher, coordinator, principal, and student.
- Real marking workflow with draft/final submission, approval status, and report-card generation.
- Standalone OMR service isolates OpenCV/Python dependencies from Next.js.
- Centralized auth helpers and sidebar role config provide a usable RBAC foundation.
- Marking templates are abstracted in `lib/marking-template.ts`.

Biggest weaknesses:

- Missing complete database schema migration.
- Custom auth has important gaps, especially IC-only student login and localStorage/session drift.
- Critical APIs lack schema validation and automated tests.
- Large page and route files concentrate too much business logic.
- OMR and AI comment services need production deployment/security hardening.

Recommended next priorities:

1. Stabilize auth and database schema.
2. Add validation and tests for login, marking, approval, OMR, and report card flows.
3. Refactor the largest route/page files into smaller feature modules.
4. Add production deployment documentation for both Next.js and FastAPI.
5. Harden service-to-service calls and remove public exposure from internal OMR/AI endpoints.
