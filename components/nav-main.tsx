"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

import type { SidebarNavItem } from "@/lib/sidebar-config";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({ items }: { items: SidebarNavItem[] }) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
        {},
    );

    React.useEffect(() => {
        setOpenGroups((prev) => {
            const next = { ...prev };

            items.forEach((item) => {
                if (!item.items?.length) return;

                const hasActiveChild = item.items.some(
                    (subItem) =>
                        pathname === subItem.url ||
                        pathname.startsWith(subItem.url + "/"),
                );

                if (hasActiveChild) {
                    next[item.title] = true;
                } else if (!(item.title in next)) {
                    next[item.title] = false;
                }
            });

            return next;
        });
    }, [items, pathname]);

    function toggleGroup(title: string) {
        setOpenGroups((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    }

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) => {
                        const isActive =
                            pathname === item.url ||
                            pathname.startsWith(item.url + "/");

                        if (item.items?.length) {
                            const isOpen = openGroups[item.title] ?? false;

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        type="button"
                                        isActive={isActive}
                                        onClick={() => toggleGroup(item.title)}
                                        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                        <ChevronDown
                                            className={`ml-auto h-4 w-4 transition-transform ${
                                                isOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </SidebarMenuButton>

                                    {isOpen && (
                                        <SidebarMenuSub>
                                            {item.items.map((subItem) => {
                                                const isSubItemActive =
                                                    pathname === subItem.url ||
                                                    pathname.startsWith(
                                                        subItem.url + "/",
                                                    );

                                                return (
                                                    <SidebarMenuSubItem
                                                        key={subItem.url}
                                                    >
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={
                                                                isSubItemActive
                                                            }
                                                        >
                                                            <Link
                                                                href={
                                                                    subItem.url
                                                                }
                                                            >
                                                                <span>
                                                                    {
                                                                        subItem.title
                                                                    }
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                );
                                            })}
                                        </SidebarMenuSub>
                                    )}
                                </SidebarMenuItem>
                            );
                        }

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                                >
                                    <Link
                                        href={item.url}
                                        className="flex items-center gap-2"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
