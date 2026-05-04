import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

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

        const studentIds = (Array.isArray(students) ? students : [])
            .map((s: any) => toId(s?.student_id))
            .filter(Boolean);

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
            (Array.isArray(subjectiveMarks) ? subjectiveMarks : [])
                .map((m: any) => toId(m?.student_id))
                .filter(Boolean)
        );
        const omrSubmitted = new Set(
            (Array.isArray(omrScans) ? omrScans : [])
                .map((m: any) => toId(m?.student_id))
                .filter(Boolean)
        );

        const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        let resultsCount = 0;
        let totalSum = 0;
        let pending = 0;
        let approved = 0;
        let rejected = 0;

        for (const r of Array.isArray(results) ? results : []) {
            if (!r || typeof r !== "object") continue;
            const grade = String((r as any).grade ?? "").trim();
            const total = toNumber((r as any).total);
            const st = String((r as any).status ?? "pending").trim();
            const hasSubjective = Boolean((r as any).subjective_id);
            if (!hasSubjective) continue;

            resultsCount += 1;
            totalSum += total;

            if (gradeCounts[grade] !== undefined) gradeCounts[grade] += 1;
            if (st === "approved") approved += 1;
            else if (st === "rejected") rejected += 1;
            else pending += 1;
        }

        const avg = resultsCount ? totalSum / resultsCount : 0;

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
        });
    } catch (err) {
        console.error("GET teacher class-summary FAILED:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
