export function SystemFooter() {
    return (
        <footer className="mt-auto border-t border-border/70 bg-background text-muted-foreground">
            <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 md:px-6">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                        STG SMK Penanti
                    </span>
                    <span className="text-border">|</span>
                    <span className="font-medium">
                        Sistem Pemarkahan Pelajar Automatik
                    </span>
                </div>

                <p className="font-medium sm:text-right">
                    Copyright 2026 STG SMK Penanti. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
