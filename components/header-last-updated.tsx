"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatMalaysiaTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export function HeaderLastUpdated({ className }: { className?: string }) {
    const [time, setTime] = useState("");

    useEffect(() => {
        const update = () => setTime(formatMalaysiaTime());
        update();
        const interval = window.setInterval(update, 60_000);
        return () => window.clearInterval(interval);
    }, []);

    return (
        <div className={cn("mt-3 flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
            <Clock className="h-3.5 w-3.5" />
            <span>
                Kemas kini:{" "}
                <span className="font-semibold text-primary">
                    {time || "Memuatkan..."}
                </span>
            </span>
        </div>
    );
}
