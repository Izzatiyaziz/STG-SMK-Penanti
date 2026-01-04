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

import { sidebarConfig } from "@/lib/sidebar-config";

type UserProfile = {
    name: string;
    email: string;
    avatar: string;
};

export function AppSidebar({
    role = "teacher",
    ...props
}: React.ComponentProps<typeof Sidebar> & {
    role: "admin" | "teacher" | "student" | "principal";
}) {
    const router = useRouter();
    const config = sidebarConfig[role];

    const [user, setUser] = React.useState<UserProfile | null>(null);

    // ================= FETCH USER =================
    React.useEffect(() => {
        const session = JSON.parse(localStorage.getItem("stg_session") || "{}");

        if (!session.role || !session.user_id) {
            router.replace("/login");
            return;
        }

        fetch("/api/auth/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session),
        })
            .then((res) => {
                if (!res.ok) throw new Error("Unauthorized");
                return res.json();
            })
            .then((data) => setUser(data))
            .catch(() => {
                localStorage.clear();
                router.replace("/login");
            });
    }, [router]);

    if (!user) return null;

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/">
                                <Image
                                    src="/img/smkp-logo.png"
                                    alt="SMK Penanti"
                                    width={28}
                                    height={28}
                                />
                                <span className="ml-2 text-base font-semibold">
                                    STG SMK Penanti
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={config.navMain} />

                {config.documents.length > 0 && (
                    <NavDocuments items={config.documents} />
                )}

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
