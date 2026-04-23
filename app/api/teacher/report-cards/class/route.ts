import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function average(arr: number[]) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teacher_id = toId(searchParams.get("teacher_id"));
        const exam_id = toId(searchParams.get("exam_id"));

        if (!teacher_id || !exam_id) {
            return NextResponse.json(
                { message: "teacher_id dan exam_id diperlukan" },
                { status: 400 }
            );
        }

        const { data: ct, error: ctErr } = await supabase
            .from("stg_class_teachers")
            .select("class_id")
            .eq("teacher_id", teacher_id)
            .maybeSingle();

        if (ctErr) {
            return NextResponse.json({ message: ctErr.message }, { status: 500 });
        }

        const class_id = toId(ct?.class_id);
        if (!class_id) {
            return NextResponse.json(
                { message: "Guru ini bukan Guru Kelas" },
                { status: 403 }
            );
        }

        const [{ data: classInfo }, { data: exam }, { data: cards }] = await Promise.all([
            supabase
                .from("stg_classes")
                .select("class_id, class_name, grade")
                .eq("class_id", class_id)
                .maybeSingle(),
            supabase
                .from("stg_exams")
                .select("exam_id, exam_name, academic_year")
                .eq("exam_id", exam_id)
                .maybeSingle(),
            supabase
                .from("stg_report_cards")
                .select("student_id, average_mark, class_position, ai_comment")
                .eq("class_id", class_id)
                .eq("teacher_id", teacher_id)
                .eq("exam_id", exam_id),
        ]);

        const studentIds = Array.from(
            new Set((cards ?? []).map((c: any) => toId(c?.student_id)).filter(Boolean))
        );

        const [{ data: students }, { data: results }] = await Promise.all([
            studentIds.length
                ? supabase
                      .from("stg_students")
                      .select("student_id, fullname")
                      .in("student_id", studentIds)
                : { data: [] as unknown[] },
            studentIds.length
                ? supabase
                      .from("stg_results")
                      .select("student_id, subject_id, total, grade, status, subjective_id")
                      .eq("exam_id", exam_id)
                      .eq("status", "approved")
                      .not("subjective_id", "is", null)
                      .in("student_id", studentIds)
                : { data: [] as unknown[] },
        ]);

        const subjectIds = Array.from(
            new Set((results ?? []).map((r: any) => toId(r?.subject_id)).filter(Boolean))
        );
        const { data: subjects } = subjectIds.length
            ? await supabase
                  .from("stg_subjects")
                  .select("subject_id, subject_name")
                  .in("subject_id", subjectIds)
            : { data: [] as unknown[] };

        const subjectNameById = new Map<string, string>();
        for (const s of Array.isArray(subjects) ? subjects : []) {
            if (!s || typeof s !== "object") continue;
            subjectNameById.set(toId((s as any).subject_id), String((s as any).subject_name ?? "").trim());
        }

        const studentNameById = new Map<string, string>();
        for (const s of Array.isArray(students) ? students : []) {
            if (!s || typeof s !== "object") continue;
            studentNameById.set(toId((s as any).student_id), String((s as any).fullname ?? "").trim());
        }

        const resultsByStudent = new Map<string, any[]>();
        for (const r of Array.isArray(results) ? results : []) {
            if (!r || typeof r !== "object") continue;
            const sid = toId((r as any).student_id);
            if (!sid) continue;
            if (!resultsByStudent.has(sid)) resultsByStudent.set(sid, []);
            resultsByStudent.get(sid)!.push(r);
        }

        const out = (cards ?? []).map((c: any) => {
            const sid = toId(c?.student_id);
            const rs = (resultsByStudent.get(sid) ?? []).map((r: any) => {
                const subjectId = toId(r?.subject_id);
                return {
                    subject_id: subjectId,
                    name: subjectNameById.get(subjectId) ?? "",
                    mark: toNumber(r?.total),
                    grade: String(r?.grade ?? "").trim(),
                };
            }).sort((a, b) => a.name.localeCompare(b.name));

            const avg = c?.average_mark == null ? average(rs.map((x) => x.mark)) : toNumber(c?.average_mark);

            return {
                student_id: sid,
                student_name: studentNameById.get(sid) ?? "",
                subjects: rs,
                average_mark: avg,
                position: c?.class_position ?? null,
                comment: String(c?.ai_comment ?? ""),
            };
        }).sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));

        return NextResponse.json({
            class: {
                id: class_id,
                name: classInfo?.class_name ?? "",
                grade: classInfo?.grade ?? null,
            },
            exam: exam
                ? { id: exam.exam_id, name: exam.exam_name, academic_year: exam.academic_year }
                : { id: exam_id, name: "", academic_year: "" },
            students: out,
        });
    } catch (err) {
        console.error("GET report-cards class FAILED:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

