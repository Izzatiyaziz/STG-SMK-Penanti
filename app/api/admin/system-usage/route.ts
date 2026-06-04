import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import {
    addDaysToDateInputValue,
    getMalaysiaDateInputValue,
    MALAYSIA_LOCALE,
    MALAYSIA_TIME_ZONE,
} from "@/lib/date-utils";

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

function toMalaysiaMidnightIso(dateKey: string) {
    return new Date(`${dateKey}T00:00:00+08:00`).toISOString();
}

function formatLabel(dateKey: string) {
    return new Date(`${dateKey}T00:00:00+08:00`).toLocaleDateString(MALAYSIA_LOCALE, {
        day: "numeric",
        month: "short",
        timeZone: MALAYSIA_TIME_ZONE,
    });
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const range = clampRange(searchParams.get("range"));
        const days = daysForRange(range);

        const endKey = getMalaysiaDateInputValue();
        const startKey = addDaysToDateInputValue(endKey, -(days - 1));

        const { data, error } = await supabase
            .from("stg_sessions")
            .select("login_time")
            .gte("login_time", toMalaysiaMidnightIso(startKey))
            .order("login_time", { ascending: true });

        if (error) {
            return NextResponse.json(
                { message: error.message, data: [] },
                { status: 500 }
            );
        }

        const counts = new Map<string, number>();
        for (const row of data ?? []) {
            const key = getMalaysiaDateInputValue(new Date(row.login_time as string));
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        const series: { date: string; value: number }[] = [];
        for (let i = 0; i < days; i++) {
            const key = addDaysToDateInputValue(startKey, i);
            series.push({
                date: formatLabel(key),
                value: counts.get(key) ?? 0,
            });
        }

        return NextResponse.json({ range, data: series });
    } catch (err) {
        console.error("SYSTEM USAGE ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
