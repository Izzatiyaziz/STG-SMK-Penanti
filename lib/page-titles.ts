export const APP_TITLE_SUFFIX = "STG SMK Penanti";

const staticPageTitles: Record<string, string> = {
  "/": "Laman Utama",
  "/login": "Log Masuk",
  "/help": "Bantuan",
  "/admin/dashboard": "Dashboard Admin",
  "/admin/users": "Pengurusan Pengguna",
  "/admin/profile": "Profil Admin",
  "/admin/assignments": "Pengurusan Tugasan",
  "/admin/classes": "Pengurusan Kelas",
  "/admin/exams": "Pengurusan Peperiksaan",
  "/admin/reports": "Laporan",
  "/admin/student": "Pengurusan Pelajar",
  "/admin/subjects": "Pengurusan Subjek",
  "/admin/teacher": "Pengurusan Guru",
  "/teacher/dashboard": "Dashboard Guru",
  "/teacher/my-class": "Kelas Saya",
  "/teacher/my-subject": "Subjek Saya",
  "/teacher/omr": "Pengimbas OMR",
  "/teacher/omr/results": "Keputusan OMR",
  "/teacher/profile": "Profil Guru",
  "/teacher/report": "Kad Laporan Pelajar",
  "/teacher/analytics": "Laporan Kelas",
  "/student/dashboard": "Dashboard Pelajar",
  "/student/my-results": "Keputusan Saya",
  "/student/profile": "Profil Pelajar",
  "/student/report-card": "Kad Laporan",
  "/coordinator/dashboard": "Dashboard Penyelaras",
  "/coordinator/assignments": "Lantikan Guru",
  "/coordinator/answer-schemes": "Skema Jawapan",
  "/coordinator/approvals": "Kelulusan Markah",
  "/coordinator/reports": "Laporan Penyelaras",
  "/principal/dashboard": "Dashboard Pengetua",
  "/principal/class-teachers": "Lantikan Guru Kelas",
};

const dynamicPageTitles: Array<[RegExp, string]> = [
  [/^\/admin\/classes\/[^/]+$/, "Butiran Kelas"],
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
