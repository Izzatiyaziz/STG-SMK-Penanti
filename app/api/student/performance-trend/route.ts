import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

export async function GET() {
    try {
        const guard = await requireApiRole("student");
        if ("response" in guard) return guard.response;

        const student_id = guard.session.user_id;

        const { data: reportCards, error } = await supabase
            .from("stg_report_cards")
            .select("exam_id, average_mark, generated_date")
            .eq("student_id", student_id)
            .order("generated_date", { ascending: false })
            .limit(6);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        const rows = Array.isArray(reportCards) ? reportCards : [];
        const examIds = Array.from(new Set(rows.map((r: any) => toId(r?.exam_id)).filter(Boolean)));

        const { data: exams } = examIds.length
            ? await supabase
                  .from("stg_exams")
                  .select("exam_id, exam_name, academic_year")
                  .in("exam_id", examIds)
            : { data: [] as unknown[] };

        const examLabelById = new Map<string, string>();
        for (const exam of Array.isArray(exams) ? exams : []) {
            const id = toId((exam as { exam_id?: unknown }).exam_id);
            const name = String((exam as { exam_name?: unknown }).exam_name ?? "").trim();
            const year = String((exam as { academic_year?: unknown }).academic_year ?? "").trim();
            if (!id) continue;
            examLabelById.set(id, [name, year].filter(Boolean).join(" ").trim());
        }

        const trend = rows
            .slice()
            .reverse()
            .map((r: any) => ({
                exam: examLabelById.get(toId(r?.exam_id)) ?? "Peperiksaan",
                average: Number(toNumber(r?.average_mark).toFixed(1)),
            }))
            .filter((p) => p.exam && Number.isFinite(p.average));

        return NextResponse.json({ success: true, data: trend });
    } catch (err: any) {
        console.error("GET student performance-trend FAILED:", err);
        return NextResponse.json({ message: err.message || "Ralat pelayan" }, { status: 500 });
    }
}

