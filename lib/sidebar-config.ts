import {
    LayoutDashboard,
    FileText,
    Users,
    Folder,
    Database,
    ListChecks,
    FileSpreadsheet,
    FileSignature,
    Camera,
    FileCheck2,
    BarChart3,
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
                title: "Pengurusan Pelajar Kelas",
                url: "/teacher/my-class",
                icon: Users,
            },
            {
                title: "Kad Laporan",
                url: "/teacher/report",
                icon: FileText,
            },
            {
                title: "Laporan",
                url: "/teacher/analytics",
                icon: BarChart3,
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
                title: "Pemarkahan Markah",
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

    /* ================= PANITIA SUBJEK ================= */
    "subject coordinator": {
        navMain: [
            {
                title: "Dashboard",
                url: "/coordinator/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Pengurusan Guru",
                url: "/coordinator/assignments",
                icon: LiaChalkboardTeacherSolid,
            },
            {
                title: "Kelulusan Markah",
                url: "/coordinator/approvals",
                icon: ListChecks,
            },
           /* {
                title: "Imbasan OMR",
                url: "/teacher/omr",
                icon: Camera,
            },*/
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
                    /*{
                        title: "Semua Pengguna",
                        url: "/admin/users",
                    },*/
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
                title: "Lantikan Guru Kelas",
                url: "/principal/class-teachers",
                icon: Database,
            },
        ],
        documents: [],
    },
};
