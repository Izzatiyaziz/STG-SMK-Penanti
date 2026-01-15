"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

type NavItem = {
    title: string;
    url: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function NavMain({ items }: { items: NavItem[] }) {
    const pathname = usePathname(); // ✅ current route

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) => {
                        // ✅ ACTIVE LOGIC
                        const isActive =
                            pathname === item.url ||
                            pathname.startsWith(item.url + "/");

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    data-active={isActive}
                                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                                >
                                    <Link
                                        href={item.url}
                                        className="flex items-center gap-2"
                                    >
                                        {item.icon && (
                                            <item.icon className="h-4 w-4" />
                                        )}
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
