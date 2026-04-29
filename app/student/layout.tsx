import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requirePageRole } from "@/lib/auth";

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requirePageRole("student");

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
                        <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:px-5 md:gap-6 md:px-6 md:py-6">
                            {children}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
