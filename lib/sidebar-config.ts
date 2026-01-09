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
} from "lucide-react";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { PiStudent } from "react-icons/pi";

/* ================= TEACHER ROLES ================= */

export const teacherRoleConfig = {
    /* ================= CLASS TEACHER ================= */
    "class teacher": {
        navMain: [
            {
                title: "Dashboard",
                url: "/teacher/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "My Class Students",
                url: "/teacher/my-class",
                icon: Users,
            },
            {
                title: "Report",
                url: "/teacher/report",
                icon: FileText,
            },
        ],
        documents: [],
    },

    /* ================= SUBJECT TEACHER ================= */
    "subject teacher": {
        navMain: [
            {
                title: "Dashboard",
                url: "/teacher/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "My Subjects",
                url: "/teacher/subjects",
                icon: Folder,
            },
            { title: "OMR Scanning", url: "/teacher/omr", icon: Camera },
            {
                title: "Reports",
                url: "/teacher/reports",
                icon: FileText,
            },
        ],
        documents: [],
    },

    /* ================= SUBJECT COORDINATOR ================= */
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
                title: "Teacher Assignments",
                url: "/coordinator/assignments",
                icon: LiaChalkboardTeacherSolid,
            },
            {
                title: "Reports",
                url: "/coordinator/reports",
                icon: FileText,
            },
        ],
        documents: [
            {
                name: "Answer Schemes",
                url: "/coordinator/answer-schemes",
                icon: FileSignature,
            },
        ],
    },
};

/* ================= MAIN SIDEBAR CONFIG ================= */

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
                title: "Teachers",
                url: "/admin/teacher",
                icon: LiaChalkboardTeacherSolid,
            },
            {
                title: "Students",
                url: "/admin/student",
                icon: PiStudent,
            },
            {
                title: "Classes",
                url: "/admin/classes",
                icon: Database,
            },
            {
                title: "Subjects",
                url: "/admin/subjects",
                icon: Folder,
            },
            {
                title: "Exams",
                url: "/admin/exams",
                icon: ListChecks,
            },
            {
                title: "Reports",
                url: "/admin/reports",
                icon: FileText,
            },
        ],
        documents: [
            {
                name: "Answer Schemes",
                url: "/admin/answer-schemes",
                icon: FileSignature,
            },
        ],
    },

    /* ================= STUDENT ================= */
    student: {
        navMain: [
            {
                title: "Dashboard",
                url: "/student/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "My Results",
                url: "/student/results",
                icon: FileText,
            },
            {
                title: "Report Card",
                url: "/student/report-card",
                icon: FileSpreadsheet,
            },
        ],
        documents: [],
    },

    /* ================= PRINCIPAL ================= */
    principal: {
        navMain: [
            {
                title: "Dashboard",
                url: "/principal/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "School Analytics",
                url: "/principal/analytics",
                icon: BarChart3,
            },
            {
                title: "Reports",
                url: "/principal/reports",
                icon: FileText,
            },
        ],
        documents: [],
    },
};
