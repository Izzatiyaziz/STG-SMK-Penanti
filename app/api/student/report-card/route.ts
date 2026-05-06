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

function gradeSummary(results: Array<{ grade: string }>) {
    const counts = new Map<string, number>();
    for (const row of results) {
        const grade = String(row.grade ?? "").trim().toUpperCase();
        if (!grade) continue;
        counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }

    return ["A", "B", "C", "D", "E", "F"]
        .filter((grade) => (counts.get(grade) ?? 0) > 0)
        .map((grade) => `${counts.get(grade)}[${grade}]`)
        .join(" ");
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("student");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const exam_id = toId(searchParams.get("exam_id"));
        const student_id = guard.session.user_id;

        const { data: studentRow, error: studentErr } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, class_id")
            .eq("student_id", student_id)
            .maybeSingle();

        if (studentErr) {
            return NextResponse.json({ message: studentErr.message }, { status: 500 });
        }
        if (!studentRow) {
            return NextResponse.json({ message: "Pelajar tidak ditemui" }, { status: 404 });
        }

        let reportCardQuery = supabase
            .from("stg_report_cards")
            .select("report_card_id, class_id, teacher_id, exam_id, average_mark, class_position, ai_comment, generated_date")
            .eq("student_id", student_id)
            .order("generated_date", { ascending: false })
            .limit(1);

        if (exam_id) {
            reportCardQuery = supabase
                .from("stg_report_cards")
                .select("report_card_id, class_id, teacher_id, exam_id, average_mark, class_position, ai_comment, generated_date")
                .eq("student_id", student_id)
                .eq("exam_id", exam_id)
                .limit(1);
        }

        const { data: reportCards, error: cardErr } = await reportCardQuery;
        if (cardErr) {
            return NextResponse.json({ message: cardErr.message }, { status: 500 });
        }

        const reportCard = Array.isArray(reportCards) ? reportCards[0] : null;
        if (!reportCard) {
            return NextResponse.json({ message: "Slip keputusan belum dijana" }, { status: 404 });
        }

        const [{ data: classRow }, { data: teacherRow }, { data: examRow }, { data: results }] = await Promise.all([
            supabase
                .from("stg_classes")
                .select("class_id, class_name, grade")
                .eq("class_id", toId(reportCard.class_id))
                .maybeSingle(),
            supabase
                .from("stg_teachers")
                .select("teacher_id, fullname")
                .eq("teacher_id", toId(reportCard.teacher_id))
                .maybeSingle(),
            supabase
                .from("stg_exams")
                .select("exam_id, exam_name, academic_year")
                .eq("exam_id", toId(reportCard.exam_id))
                .maybeSingle(),
            supabase
                .from("stg_results")
                .select("subject_id, total, grade")
                .eq("student_id", student_id)
                .eq("exam_id", toId(reportCard.exam_id))
                .eq("status", "approved"),
        ]);

        const subjectIds = Array.from(new Set((results ?? []).map((row: any) => toId(row?.subject_id)).filter(Boolean)));
        const { data: subjects } = subjectIds.length
            ? await supabase.from("stg_subjects").select("subject_id, subject_name").in("subject_id", subjectIds)
            : { data: [] as unknown[] };

        const subjectNameById = new Map<string, string>();
        for (const subject of Array.isArray(subjects) ? subjects : []) {
            const id = toId((subject as { subject_id?: unknown }).subject_id);
            const name = String((subject as { subject_name?: unknown }).subject_name ?? "").trim();
            if (id) subjectNameById.set(id, name);
        }

        const subjectResults = (results ?? [])
            .map((row: any) => ({
                subject: subjectNameById.get(toId(row?.subject_id)) ?? "",
                mark: toNumber(row?.total),
                grade: String(row?.grade ?? "").trim().toUpperCase(),
            }))
            .sort((a, b) => a.subject.localeCompare(b.subject));

        const totalMarks = subjectResults.reduce((sum, row) => sum + row.mark, 0);

        return NextResponse.json({
            success: true,
            student: {
                name: String(studentRow.fullname ?? ""),
                ic: String(studentRow.ic_number ?? ""),
                className: String(classRow?.class_name ?? ""),
                exam: String(examRow?.exam_name ?? ""),
                year: String(examRow?.academic_year ?? ""),
                classTeacher: String(teacherRow?.fullname ?? ""),
            },
            results: subjectResults,
            summary: {
                totalSubjects: subjectResults.length,
                totalMarks,
                classRank: reportCard.class_position ? `${reportCard.class_position}` : "-",
                percentage: Number(toNumber(reportCard.average_mark).toFixed(1)),
                gradeSummary: gradeSummary(subjectResults),
                comment: String(reportCard.ai_comment ?? "").trim(),
            },
        });
    } catch (err: any) {
        console.error("GET student report-card FAILED:", err);
        return NextResponse.json({ message: err.message || "Ralat pelayan" }, { status: 500 });
    }
}
