import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import { compareExamsChronologically } from "@/lib/exam-utils";

export const runtime = "nodejs";

type ReportCardRow = {
    exam_id?: unknown;
    average_mark?: unknown;
};

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

        const rows = Array.isArray(reportCards) ? (reportCards as ReportCardRow[]) : [];
        const examIds = Array.from(new Set(rows.map((row) => toId(row.exam_id)).filter(Boolean)));

        const { data: exams } = examIds.length
            ? await supabase
                  .from("stg_exams")
                  .select("exam_id, exam_name, academic_year")
                  .in("exam_id", examIds)
            : { data: [] as unknown[] };

        const examById = new Map<string, { name: string; year: string }>();
        for (const exam of Array.isArray(exams) ? exams : []) {
            const id = toId((exam as { exam_id?: unknown }).exam_id);
            const name = String((exam as { exam_name?: unknown }).exam_name ?? "").trim();
            const year = String((exam as { academic_year?: unknown }).academic_year ?? "").trim();
            if (!id) continue;
            examById.set(id, { name, year });
        }

        const trend = rows
            .map((row) => ({
                examId: toId(row.exam_id),
                average: Number(toNumber(row.average_mark).toFixed(1)),
            }))
            .filter((p) => p.examId && Number.isFinite(p.average))
            .sort((a, b) => {
                const examA = examById.get(a.examId) ?? { name: "Peperiksaan", year: "" };
                const examB = examById.get(b.examId) ?? { name: "Peperiksaan", year: "" };
                return compareExamsChronologically(examA, examB);
            })
            .map((point) => {
                const exam = examById.get(point.examId) ?? { name: "Peperiksaan", year: "" };
                return {
                    exam: [exam.name, exam.year].filter(Boolean).join(" ").trim(),
                    average: point.average,
                };
            });

        return NextResponse.json({ success: true, data: trend });
    } catch (err: unknown) {
        console.error("GET student performance-trend FAILED:", err);
        return NextResponse.json(
            { message: err instanceof Error ? err.message : "Ralat pelayan" },
            { status: 500 }
        );
    }
}
