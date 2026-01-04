"use client";

import * as React from "react";
import { PlusCircle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
    title: string;
    url: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function NavMain({ items }: { items: NavItem[] }) {
    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <SidebarMenuButton
                            tooltip="Quick Create"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <PlusCircle />
                            <span>Quick Create</span>
                        </SidebarMenuButton>
                        <Button
                            size="icon"
                            className="size-8"
                            variant="outline"
                        >
                            <Mail />
                            <span className="sr-only">Inbox</span>
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>

                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton tooltip={item.title}>
                                {item.icon && <item.icon className="h-4 w-4" />}
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
