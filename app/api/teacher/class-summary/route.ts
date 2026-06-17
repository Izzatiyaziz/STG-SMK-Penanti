import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";
import { getActiveAcademicYearFromValues } from "@/lib/academic-year";

export const runtime = "nodejs";

type StudentRow = { student_id?: unknown; fullname?: unknown };
type StudentIdRow = { student_id?: unknown };
type ResultRow = {
    student_id?: unknown;
    total?: unknown;
    grade?: unknown;
    status?: unknown;
    subjective_id?: unknown;
};
type TrendResultRow = { exam_id?: unknown; total?: unknown };
type ExamRow = { exam_id?: unknown; exam_name?: unknown; academic_year?: unknown };

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const teacher_id = toId(searchParams.get("teacher_id"));
        const class_id = toId(searchParams.get("class_id"));
        const subject_id = toId(searchParams.get("subject_id"));
        const exam_id = toId(searchParams.get("exam_id"));

        if (!teacher_id || !class_id || !subject_id || !exam_id) {
            return NextResponse.json(
                { message: "teacher_id, class_id, subject_id, exam_id diperlukan" },
                { status: 400 }
            );
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        // Ensure teacher is assigned to this subject+class
        const { data: assignment, error: assignErr } = await supabaseAdmin
            .from("stg_teacher_subject")
            .select("teacher_subject_id")
            .eq("teacher_id", teacher_id)
            .eq("subject_id", subject_id)
            .eq("class_id", class_id)
            .limit(1);

        if (assignErr) {
            return NextResponse.json({ message: assignErr.message }, { status: 500 });
        }
        if (!Array.isArray(assignment) || assignment.length === 0) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: selectedExam } = await supabaseAdmin
            .from("stg_exams")
            .select("academic_year")
            .eq("exam_id", exam_id)
            .maybeSingle();
        const { data: yearRows } = await supabaseAdmin
            .from("stg_exams")
            .select("academic_year")
            .order("academic_year", { ascending: false })
            .limit(200);
        const activeAcademicYear = getActiveAcademicYearFromValues(
            (Array.isArray(yearRows) ? yearRows : []).map((exam) => exam.academic_year)
        );

        if (toId(selectedExam?.academic_year) !== activeAcademicYear) {
            return NextResponse.json({ message: "Peperiksaan ini telah diarkibkan" }, { status: 403 });
        }

        const [{ data: classInfo }, { data: students }] = await Promise.all([
            supabaseAdmin
                .from("stg_classes")
                .select("class_id, class_name, grade")
                .eq("class_id", class_id)
                .maybeSingle(),
            supabaseAdmin
                .from("stg_students")
                .select("student_id, fullname")
                .eq("class_id", class_id),
        ]);

        const studentRows = (Array.isArray(students) ? students : []) as StudentRow[];
        const studentIds = studentRows
            .map((student) => toId(student.student_id))
            .filter(Boolean);

        const studentNameById = new Map<string, string>();
        for (const student of studentRows) {
            const id = toId(student.student_id);
            const name = String(student.fullname ?? "").trim();
            if (id) studentNameById.set(id, name);
        }

        if (studentIds.length === 0) {
            return NextResponse.json({
                class: {
                    id: class_id,
                    name: classInfo?.class_name ?? "",
                    grade: classInfo?.grade ?? null,
                },
                totals: {
                    students: 0,
                    results: 0,
                    submitted: 0,
                    approved: 0,
                    pending: 0,
                    rejected: 0,
                    average_total: 0,
                },
                grades: [],
                student_results: [],
                top_students: [],
                trend: [],
            });
        }

        const [{ data: subjectiveMarks }, { data: results }, { data: omrScans }] =
            await Promise.all([
                supabaseAdmin
                    .from("stg_subjective_marks")
                    .select("student_id")
                    .eq("teacher_id", teacher_id)
                    .eq("subject_id", subject_id)
                    .eq("exam_id", exam_id)
                    .in("student_id", studentIds),
                supabaseAdmin
                    .from("stg_results")
                    .select("student_id, total, grade, status, subjective_id")
                    .eq("subject_id", subject_id)
                    .eq("exam_id", exam_id)
                    .in("student_id", studentIds),
                supabaseAdmin
                    .from("stg_omr_scans")
                    .select("student_id")
                    .eq("subject_id", subject_id)
                    .eq("exam_id", exam_id)
                    .in("student_id", studentIds),
            ]);

        const subjectiveSubmitted = new Set(
            ((Array.isArray(subjectiveMarks) ? subjectiveMarks : []) as StudentIdRow[])
                .map((mark) => toId(mark.student_id))
                .filter(Boolean)
        );
        const omrSubmitted = new Set(
            ((Array.isArray(omrScans) ? omrScans : []) as StudentIdRow[])
                .map((scan) => toId(scan.student_id))
                .filter(Boolean)
        );

        const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        let resultsCount = 0;
        let totalSum = 0;
        let pending = 0;
        let approved = 0;
        let rejected = 0;

        const studentResults: Array<{
            student_id: string;
            student_name: string;
            total: number;
            grade: string;
            status: string;
        }> = [];

        for (const r of (Array.isArray(results) ? results : []) as ResultRow[]) {
            if (!r || typeof r !== "object") continue;
            const grade = String(r.grade ?? "").trim();
            const total = toNumber(r.total);
            const st = String(r.status ?? "pending").trim();
            const hasSubjective = Boolean(r.subjective_id);
            if (!hasSubjective) continue;

            const studentId = toId(r.student_id);
            studentResults.push({
                student_id: studentId,
                student_name: studentNameById.get(studentId) ?? "",
                total,
                grade,
                status: st,
            });

            resultsCount += 1;
            totalSum += total;

            if (gradeCounts[grade] !== undefined) gradeCounts[grade] += 1;
            if (st === "approved") approved += 1;
            else if (st === "rejected") rejected += 1;
            else pending += 1;
        }

        const avg = resultsCount ? totalSum / resultsCount : 0;

        const topStudents = studentResults
            .slice()
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        const { data: trendResults } = await supabaseAdmin
            .from("stg_results")
            .select("exam_id, total")
            .eq("subject_id", subject_id)
            .eq("status", "approved")
            .not("total", "is", null)
            .in("student_id", studentIds);

        const trendExamIds = Array.from(
            new Set(
                ((Array.isArray(trendResults) ? trendResults : []) as TrendResultRow[])
                    .map((row) => toId(row.exam_id))
                    .filter(Boolean)
            )
        );
        const { data: trendExams } = trendExamIds.length
            ? await supabaseAdmin
                .from("stg_exams")
                .select("exam_id, exam_name, academic_year")
                .in("exam_id", trendExamIds)
            : { data: [] };
        const examById = new Map(
            ((Array.isArray(trendExams) ? trendExams : []) as ExamRow[]).map((exam) => [
                toId(exam.exam_id),
                {
                    name: String(exam.exam_name ?? "").trim(),
                    year: String(exam.academic_year ?? "").trim(),
                },
            ])
        );
        const trendGroups = new Map<string, { total: number; results: number }>();
        for (const row of (Array.isArray(trendResults) ? trendResults : []) as TrendResultRow[]) {
            const examId = toId(row.exam_id);
            if (!examId) continue;
            if (examById.get(examId)?.year !== activeAcademicYear) continue;
            const current = trendGroups.get(examId) ?? { total: 0, results: 0 };
            current.total += toNumber(row.total);
            current.results += 1;
            trendGroups.set(examId, current);
        }
        const trend = Array.from(trendGroups.entries())
            .map(([examId, group]) => ({
                exam_id: examId,
                exam: examById.get(examId)?.name ?? examId,
                year: examById.get(examId)?.year ?? "",
                total: group.total,
                results: group.results,
                average: group.results ? group.total / group.results : 0,
            }))
            .sort((a, b) => a.year.localeCompare(b.year) || a.exam.localeCompare(b.exam, "ms-MY"));

        return NextResponse.json({
            class: {
                id: class_id,
                name: classInfo?.class_name ?? "",
                grade: classInfo?.grade ?? null,
            },
            totals: {
                students: studentIds.length,
                results: resultsCount,
                submitted: subjectiveSubmitted.size,
                omr_scanned: omrSubmitted.size,
                approved,
                pending,
                rejected,
                average_total: avg,
            },
            grades: Object.entries(gradeCounts)
                .map(([grade, value]) => ({ grade, value }))
                .filter((g) => g.value > 0),
            student_results: studentResults,
            top_students: topStudents,
            trend,
        });
    } catch (err) {
        console.error("GET teacher class-summary FAILED:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
