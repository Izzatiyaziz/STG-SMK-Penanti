import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function clampRange(range: string | null): "7d" | "30d" | "3m" {
    if (range === "7d" || range === "30d" || range === "3m") return range;
    return "30d";
}

function daysForRange(range: "7d" | "30d" | "3m") {
    if (range === "7d") return 7;
    if (range === "3m") return 90;
    return 30;
}

function formatLabel(date: Date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const range = clampRange(searchParams.get("range"));
        const days = daysForRange(range);

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        start.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from("stg_sessions")
            .select("login_time")
            .gte("login_time", start.toISOString())
            .order("login_time", { ascending: true });

        if (error) {
            return NextResponse.json(
                { message: error.message, data: [] },
                { status: 500 }
            );
        }

        const counts = new Map<string, number>();
        for (const row of data ?? []) {
            const d = new Date(row.login_time as string);
            d.setHours(0, 0, 0, 0);
            const key = d.toISOString();
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        const series: { date: string; value: number }[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toISOString();
            series.push({
                date: formatLabel(d),
                value: counts.get(key) ?? 0,
            });
        }

        return NextResponse.json({ range, data: series });
    } catch (err) {
        console.error("SYSTEM USAGE ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
