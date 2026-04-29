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
            .select("student_id, enrollment_date");

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        let updated = 0;
        for (const s of students ?? []) {
            const lvl = deriveLevel(s.enrollment_date as any);
            if (!lvl) continue;

            const { error: uErr } = await supabase
                .from("stg_students")
                .update({ level: lvl })
                .eq("student_id", s.student_id);

            if (!uErr) updated++;
        }

        return NextResponse.json({ success: true, updated });
    } catch (err) {
        console.error("RECALC LEVELS ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
