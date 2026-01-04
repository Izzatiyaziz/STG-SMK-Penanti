import {
    LayoutDashboard,
    Camera,
    FileText,
    BarChart3,
    Users,
    UserCheck,
    Settings,
    HelpCircle,
    Folder,
    Database,
    ListChecks,
    FileSpreadsheet,
    FileSignature,
} from "lucide-react";

export const sidebarConfig = {
    admin: {
        navMain: [
            {
                title: "Dashboard",
                url: "/admin/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Users",
                url: "/admin/users",
                icon: Users,
            },
            {
                title: "Classes",
                url: "/classes",
                icon: Database,
            },
            {
                title: "Subjects",
                url: "/subjects",
                icon: Folder,
            },
            {
                title: "Exams",
                url: "/exams",
                icon: ListChecks,
            },
            {
                title: "Reports",
                url: "/reports",
                icon: FileText,
            },
        ],
        documents: [
            {
                name: "Answer Schemes",
                url: "/answer-schemes",
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
