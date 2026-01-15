"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Settings, HelpCircle, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

import { sidebarConfig, teacherRoleConfig } from "@/lib/sidebar-config";

/* ================= TYPES ================= */

type UserType = "admin" | "student" | "principal";
type TeacherUserType = "teacher";

type TeacherRole = "class teacher" | "subject teacher" | "subject coordinator";

type Session = {
    user_id: string;
    userType: UserType | TeacherUserType;
    role: string;
};

type UserProfile = {
    name: string;
    email: string;
    avatar: string;
};

/* ============== HELPERS ============== */

// 🔥 VERY IMPORTANT
const normalize = (value: string) => value.toLowerCase().trim();

function isTeacherRole(role: string): role is TeacherRole {
    return normalize(role) in teacherRoleConfig;
}

/* ============== COMPONENT ============== */

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter();

    const [user, setUser] = React.useState<UserProfile | null>(null);
    const [session, setSession] = React.useState<Session | null>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem("stg_session");

        if (!stored) {
            router.replace("/login");
            return;
        }

        let parsed: Session;

        try {
            parsed = JSON.parse(stored);
        } catch {
            localStorage.removeItem("stg_session");
            router.replace("/login");
            return;
        }

        if (!parsed.user_id || !parsed.userType || !parsed.role) {
            localStorage.removeItem("stg_session");
            router.replace("/login");
            return;
        }

        // 🔥 NORMALIZE ROLE (FIX MENU NOT APPEARING)
        parsed.role = normalize(parsed.role);

        setSession(parsed);

        fetch("/api/auth/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role: parsed.userType,
                user_id: parsed.user_id,
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error("Unauthorized");
                return res.json();
            })
            .then((data: UserProfile) => setUser(data))
            .catch(() => {
                router.replace("/login");
            });
    }, [router]);

    if (!user || !session) return null;

    /* ========== RESOLVE SIDEBAR CONFIG ========== */

    let config:
        | {
              navMain: any[];
              documents: any[];
          }
        | undefined;

    if (session.userType === "teacher") {
        if (isTeacherRole(session.role)) {
            config = teacherRoleConfig[session.role];
        }
    } else {
        config = sidebarConfig[session.userType];
    }

    if (!config) return null;

    const { navMain = [], documents = [] } = config;

    /* ================= RENDER ================= */

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <Image
                                    src="/img/smkp-logo.png"
                                    alt="SMK Penanti"
                                    width={500}
                                    height={500}
                                    className="size-6"
                                />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="ml-2 text-base font-semibold">
                                    STG SMK Penanti
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMain} />

                {documents.length > 0 && <NavDocuments items={documents} />}

                <NavSecondary
                    items={[
                        {
                            title: "Settings",
                            url: "/settings",
                            icon: Settings as LucideIcon,
                        },
                        {
                            title: "Help",
                            url: "/help",
                            icon: HelpCircle as LucideIcon,
                        },
                    ]}
                    className="mt-auto"
                />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
        </Sidebar>
    );
}
