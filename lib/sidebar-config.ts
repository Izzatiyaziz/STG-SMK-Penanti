import {
    LayoutDashboard,
    FileText,
    BarChart3,
    Users,
    Folder,
    Database,
    ListChecks,
    FileSpreadsheet,
    FileSignature,
    Camera,
    FileCheck2,
} from "lucide-react";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";

export type SidebarNavChildItem = {
    title: string;
    url: string;
};

export type SidebarNavItem = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    items?: SidebarNavChildItem[];
};

/* ================= PERANAN GURU ================= */

export const teacherRoleConfig = {
    /* ================= GURU KELAS ================= */
    "class teacher": {
        navMain: [
            {
                title: "Dashboard",
                url: "/teacher/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Pelajar Kelas Saya",
                url: "/teacher/my-class",
                icon: Users,
            },
            {
                title: "Laporan",
                url: "/teacher/reports",
                icon: FileText,
            },
        ],
        documents: [],
    },

    /* ================= GURU SUBJEK ================= */
    "subject teacher": {
        navMain: [
            {
                title: "Dashboard",
                url: "/teacher/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Subjek Saya",
                url: "/teacher/my-subject",
                icon: Folder,
            },
            {
                title: "Imbasan OMR",
                url: "/teacher/omr",
                icon: Camera,
            },
            {
                title: "Laporan",
                url: "/teacher/report",
                icon: FileText,
            },
        ],
        documents: [],
    },

    /* ================= PENYELARAS SUBJEK ================= */
    "subject coordinator": {
        navMain: [
            {
                title: "Dashboard",
                url: "/coordinator/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Pending Approvals",
                url: "/coordinator/approvals",
                icon: ListChecks,
            },
            {
                title: "Pengurusan Guru",
                url: "/coordinator/assignments",
                icon: LiaChalkboardTeacherSolid,
            },
            {
                title: "Imbasan OMR",
                url: "/teacher/omr",
                icon: Camera,
            },
            {
                title: "Laporan",
                url: "/coordinator/reports",
                icon: FileText,
            },
        ],
        documents: [
            {
                name: "Skema Jawapan",
                url: "/coordinator/answer-schemes",
                icon: FileSignature,
            },
        ],
    },
};

/* ================= KONFIGURASI SIDEBAR UTAMA ================= */

export const sidebarConfig = {
    /* ================= ADMIN ================= */
    admin: {
        navMain: [
            {
                title: "Dashboard",
                url: "/admin/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Pengurusan Pengguna",
                url: "/admin/users",
                icon: Users,
                items: [
                    {
                        title: "Semua Pengguna",
                        url: "/admin/users",
                    },
                    {
                        title: "Guru",
                        url: "/admin/teacher",
                    },
                    {
                        title: "Pelajar",
                        url: "/admin/student",
                    },
                ],
            },
            {
                title: "Kelas",
                url: "/admin/classes",
                icon: Database,
            },
            {
                title: "Subjek",
                url: "/admin/subjects",
                icon: Folder,
            },
            {
                title: "Peperiksaan",
                url: "/admin/exams",
                icon: FileCheck2,
            },
            // {
            //     title: "Assign Guru",
            //     url: "/admin/assignments",
            //     icon: FileSignature,
            // },
            // {
            //     title: "Laporan",
            //     url: "/admin/reports",
            //     icon: FileText,
            // },
        ],
        documents: [],

    },

    /* ================= PELAJAR ================= */
    student: {
        navMain: [
            {
                title: "Dashboard",
                url: "/student/dashboard",
                icon: LayoutDashboard,
            },
           /* {
                title: "Keputusan Saya",
                url: "/student/my-results",
                icon: FileText,
            },*/
            {
                title: "Kad Laporan",
                url: "/student/report-card",
                icon: FileSpreadsheet,
            },
        ],
        documents: [],
    },

    /* ================= PENGETUA ================= */
    principal: {
        navMain: [
            {
                title: "Dashboard",
                url: "/principal/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Analitik Sekolah",
                url: "/principal/analytics",
                icon: BarChart3,
            },
            {
                title: "Laporan",
                url: "/principal/reports",
                icon: FileText,
            },
        ],
        documents: [],
    },
};
