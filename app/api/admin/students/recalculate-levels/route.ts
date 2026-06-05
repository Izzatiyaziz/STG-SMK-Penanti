import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function deriveLevel(enrollmentDate: string | null | undefined) {
    if (!enrollmentDate) return null;
    const d = new Date(enrollmentDate);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const years = now.getFullYear() - d.getFullYear() + 1;
    const clamped = Math.max(1, Math.min(5, years));
    return String(clamped);
}

export async function POST() {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { data: students, error } = await supabase
            .from("stg_students")
            .select("student_id, enrollment_date")
            .limit(5000);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        const byLevel: Record<string, string[]> = {};
        for (const s of students ?? []) {
            const lvl = deriveLevel(s.enrollment_date as any);
            if (!lvl) continue;
            (byLevel[lvl] ??= []).push(s.student_id as string);
        }

        let updated = 0;
        const errors: string[] = [];
        for (const [lvl, ids] of Object.entries(byLevel)) {
            const { error: uErr, count } = await supabase
                .from("stg_students")
                .update({ level: lvl })
                .in("student_id", ids)
                .select("student_id", { count: "exact", head: true });

            if (uErr) {
                errors.push(`Level ${lvl}: ${uErr.message}`);
            } else {
                updated += count ?? ids.length;
            }
        }

        return NextResponse.json({
            success: errors.length === 0,
            updated,
            ...(errors.length ? { errors } : {}),
        });
    } catch (err) {
        console.error("RECALC LEVELS ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
