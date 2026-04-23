import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teacher_id = String(searchParams.get("teacher_id") ?? "").trim();
        const class_id = String(searchParams.get("class_id") ?? "").trim();
        const subject_id = String(searchParams.get("subject_id") ?? "").trim();
        const exam_id = String(searchParams.get("exam_id") ?? "").trim();

        if (!teacher_id || !class_id || !subject_id || !exam_id) {
            return NextResponse.json({
                totalStudents: 0,
                submittedCount: 0,
                isComplete: false,
                approval: {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    status: "none",
                },
            });
        }

        const { data: students } = await supabase
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);

        const studentIds = (Array.isArray(students) ? students : [])
            .map((s: unknown) => {
                if (!s || typeof s !== "object") return "";
                return String((s as { student_id?: unknown }).student_id ?? "").trim();
            })
            .filter((x) => Boolean(x));

        if (studentIds.length === 0) {
            return NextResponse.json({
                totalStudents: 0,
                submittedCount: 0,
                isComplete: true,
                approval: {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    status: "none",
                },
            });
        }

        const { data: marks } = await supabase
            .from("stg_subjective_marks")
            .select("student_id")
            .eq("teacher_id", teacher_id)
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .in("student_id", studentIds);

        const submittedIds = new Set(
            (Array.isArray(marks) ? marks : [])
                .map((m: unknown) => {
                    if (!m || typeof m !== "object") return "";
                    return String(
                        (m as { student_id?: unknown }).student_id ?? ""
                    ).trim();
                })
                .filter((x) => Boolean(x))
        );

        const submittedCount = submittedIds.size;
        const totalStudents = studentIds.length;

        // Approval status (based on results linked to this teacher's subjective submissions)
        const { data: results } = await supabase
            .from("stg_results")
            .select("status, subjective_id, student_id")
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .in("student_id", studentIds);

        const subjectiveIds = Array.from(
            new Set(
                (results ?? [])
                    .map((r: unknown) => {
                        if (!r || typeof r !== "object") return "";
                        return String(
                            (r as { subjective_id?: unknown }).subjective_id ?? ""
                        ).trim();
                    })
                    .filter((x) => Boolean(x))
            )
        );

        const { data: subjectiveMarks } = subjectiveIds.length
            ? await supabase
                  .from("stg_subjective_marks")
                  .select("subjective_id, teacher_id")
                  .in("subjective_id", subjectiveIds)
            : { data: [] as unknown[] };

        const mySubjectiveIdSet = new Set<string>();
        for (const m of Array.isArray(subjectiveMarks) ? subjectiveMarks : []) {
            if (!m || typeof m !== "object") continue;
            const sid = String(
                (m as { subjective_id?: unknown }).subjective_id ?? ""
            ).trim();
            const tid = String(
                (m as { teacher_id?: unknown }).teacher_id ?? ""
            ).trim();
            if (sid && tid === teacher_id) mySubjectiveIdSet.add(sid);
        }

        let pending = 0;
        let approved = 0;
        let rejected = 0;
        let total = 0;

        for (const r of Array.isArray(results) ? results : []) {
            if (!r || typeof r !== "object") continue;
            const sid = String(
                (r as { subjective_id?: unknown }).subjective_id ?? ""
            ).trim();
            if (!sid || !mySubjectiveIdSet.has(sid)) continue;

            const st = String((r as { status?: unknown }).status ?? "").trim();
            total += 1;
            if (st === "approved") approved += 1;
            else if (st === "rejected") rejected += 1;
            else pending += 1;
        }

        const approvalStatus =
            total === 0
                ? "none"
                : pending > 0
                  ? "pending"
                  : rejected > 0
                    ? "rejected"
                    : approved === total
                      ? "approved"
                      : "mixed";

        return NextResponse.json({
            totalStudents,
            submittedCount,
            isComplete: submittedCount >= totalStudents,
            approval: {
                total,
                pending,
                approved,
                rejected,
                status: approvalStatus,
            },
        });
    } catch (err) {
        console.error("GET marks status FAILED:", err);
        return NextResponse.json({
            totalStudents: 0,
            submittedCount: 0,
            isComplete: false,
            approval: {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                status: "none",
            },
        });
    }
}
