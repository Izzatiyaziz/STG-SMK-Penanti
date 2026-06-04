import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SystemFooter } from "@/components/system-footer";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requirePageRole } from "@/lib/auth";

export default async function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requirePageRole("subject coordinator");

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar />

            <SidebarInset className="min-w-0">
                <SiteHeader />

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex min-w-0 flex-1 flex-col">
                            {children}
                        </div>
                        <SystemFooter />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
