"use client";

import * as React from "react";
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
    roles?: string[];
    session_id?: string | null;
};

type UserProfile = {
    name: string;
    email: string;
    avatar: string;
    roles?: string[];
};

type IconLike = React.ComponentType<{ className?: string }>;

type SidebarNavItem = {
    title: string;
    url: string;
    icon: IconLike;
};

type SidebarDocItem = {
    name: string;
    url: string;
    icon: IconLike;
};

type SidebarResolvedConfig = {
    navMain: SidebarNavItem[];
    documents: SidebarDocItem[];
};

/* ============== HELPERS ============== */

// 🔥 VERY IMPORTANT
const normalize = (value: string) => value.toLowerCase().trim();

function isTeacherRole(role: string): role is TeacherRole {
    return normalize(role) in teacherRoleConfig;
}

function uniqueByUrl(items: SidebarNavItem[]) {
    const seen = new Set<string>();
    const out: SidebarNavItem[] = [];
    for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        out.push(item);
    }
    return out;
}

function uniqueDocsByUrl(items: SidebarDocItem[]) {
    const seen = new Set<string>();
    const out: SidebarDocItem[] = [];
    for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        out.push(item);
    }
    return out;
}

function mergeTeacherConfigs(roles: TeacherRole[]): SidebarResolvedConfig {
    const labelByRole: Record<TeacherRole, string> = {
        "class teacher": "Kelas",
        "subject teacher": "Subjek",
        "subject coordinator": "Penyelaras",
    };

    const titleSeen = new Map<string, number>();
    const nav: SidebarNavItem[] = [];
    const docs: SidebarDocItem[] = [];

    for (const role of roles) {
        const cfg = teacherRoleConfig[role];
        for (const item of cfg.navMain ?? []) {
            const seenCount = titleSeen.get(item.title) ?? 0;
            const title = seenCount === 0 ? item.title : `${item.title} (${labelByRole[role]})`;
            nav.push({ ...item, title });
            titleSeen.set(item.title, seenCount + 1);
        }

        for (const d of cfg.documents ?? []) {
            docs.push(d);
        }
    }

    return { navMain: uniqueByUrl(nav), documents: uniqueDocsByUrl(docs) };
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
        parsed.roles = Array.isArray((parsed as { roles?: unknown }).roles)
            ? ((parsed as { roles?: unknown }).roles as unknown[]).map((r) =>
                  normalize(String(r))
              )
            : undefined;

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
            .then((data: UserProfile) => {
                // If teacher roles changed in DB, auto-pick the first role.
                if (parsed.userType === "teacher") {
                    const roles = (data.roles ?? []).map(normalize);
                    parsed.roles = roles;
                    if (roles.length > 0 && !roles.includes(parsed.role)) {
                        parsed.role = roles[0];
                    }

                    localStorage.setItem("stg_session", JSON.stringify(parsed));
                }

                setSession(parsed);
                setUser(data);
            })
            .catch(() => {
                router.replace("/login");
            });
    }, [router]);

    if (!user || !session) return null;

    if (session.userType === "principal") return null;

    /* ========== RESOLVE SIDEBAR CONFIG ========== */

    let config: SidebarResolvedConfig | undefined;

    if (session.userType === "teacher") {
        const rawRoles = Array.isArray(session.roles) && session.roles.length > 0
            ? session.roles
            : [session.role];

        const roles = Array.from(new Set(rawRoles.map(normalize))).filter(
            isTeacherRole
        );

        const order: TeacherRole[] = [
            "subject teacher",
            "class teacher",
            "subject coordinator",
        ];
        roles.sort((a, b) => order.indexOf(a) - order.indexOf(b));

        if (roles.length === 1) {
            config = teacherRoleConfig[roles[0]];
        } else if (roles.length > 1) {
            config = mergeTeacherConfigs(roles);
        } else if (isTeacherRole(session.role)) {
            config = teacherRoleConfig[session.role];
        }
    } else {
        config = sidebarConfig[session.userType];
    }

    if (!config) return null;

    const { navMain = [], documents = [] } = config;
    const profilePath = `/${session.userType}/profile`;

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
                            title: "Account",
                            url: profilePath,
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
