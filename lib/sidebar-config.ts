import {
    LayoutDashboard,
    Camera,
    FileText,
    BarChart3,
    Users,
    Folder,
    Database,
    ListChecks,
    FileSpreadsheet,
    FileSignature,
} from "lucide-react";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { PiStudent } from "react-icons/pi";

export const sidebarConfig = {
    admin: {
        navMain: [
            {
                title: "Dashboard",
                url: "/admin/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Teacher",
                url: "/admin/teacher",
                icon: LiaChalkboardTeacherSolid,
            },
            {
                title: "Student",
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

    teacher: {
        navMain: [
            {
                title: "Dashboard",
                url: "/teacher/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "OMR Scanning",
                url: "/omr",
                icon: Camera,
            },
            {
                title: "My Classes",
                url: "/teacher/classes",
                icon: Database,
            },
            {
                title: "Results",
                url: "/results",
                icon: FileText,
            },
        ],
        documents: [
            {
                name: "Subjects",
                url: "/subjects",
                icon: Folder,
            },
        ],
    },

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

    principal: {
        navMain: [
            {
                title: "Dashboard",
                url: "/principal/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "School Analytics",
                url: "/analytics",
                icon: BarChart3,
            },
            {
                title: "Reports",
                url: "/reports",
                icon: FileText,
            },
        ],
        documents: [],
    },
};
