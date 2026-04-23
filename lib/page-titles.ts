export const APP_TITLE_SUFFIX = "STG SMK Penanti";

const staticPageTitles: Record<string, string> = {
  "/": "Home",
  "/login": "Login",
  "/help": "Help",
  "/admin/dashboard": "Admin Dashboard",
  "/admin/users": "User Management",
  "/admin/profile": "Admin Profile",
  "/admin/assignments": "Assignment Management",
  "/admin/classes": "Class Management",
  "/admin/exams": "Exam Management",
  "/admin/reports": "Reports",
  "/admin/student": "Student Management",
  "/admin/subjects": "Subject Management",
  "/admin/teacher": "Teacher Management",
  "/teacher/dashboard": "Teacher Dashboard",
  "/teacher/my-class": "My Class",
  "/teacher/my-subject": "My Subject",
  "/teacher/omr": "OMR Scanner",
  "/teacher/omr/results": "OMR Results",
  "/teacher/profile": "Teacher Profile",
  "/teacher/report": "Class Report",
  "/teacher/reports": "Reports",
  "/student/dashboard": "Student Dashboard",
  "/student/my-results": "My Results",
  "/student/profile": "Student Profile",
  "/student/report-card": "Report Card",
  "/coordinator/dashboard": "Coordinator Dashboard",
  "/coordinator/assignments": "Teacher Assignments",
  "/coordinator/answer-schemes": "Answer Schemes",
  "/coordinator/approvals": "Mark Approvals",
  "/coordinator/reports": "Coordinator Reports",
};

const dynamicPageTitles: Array<[RegExp, string]> = [
  [/^\/admin\/classes\/[^/]+$/, "Class Details"],
];

export function getPageTitle(pathname: string | null | undefined) {
  if (!pathname) return APP_TITLE_SUFFIX;

  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const staticTitle = staticPageTitles[normalizedPath];

  if (staticTitle) {
    return `${staticTitle} | ${APP_TITLE_SUFFIX}`;
  }

  for (const [pattern, title] of dynamicPageTitles) {
    if (pattern.test(normalizedPath)) {
      return `${title} | ${APP_TITLE_SUFFIX}`;
    }
  }

  return APP_TITLE_SUFFIX;
}

export function getHeaderTitle(pathname: string | null | undefined) {
  const documentTitle = getPageTitle(pathname);
  return documentTitle.replace(` | ${APP_TITLE_SUFFIX}`, "");
}
