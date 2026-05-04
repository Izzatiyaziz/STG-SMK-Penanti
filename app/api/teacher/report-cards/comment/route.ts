import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function buildAiComment(params: {
    average: number;
    weakestSubject?: string | null;
}) {
    const avg = params.average;
    const weak = params.weakestSubject ? ` Fokus pada subjek ${params.weakestSubject}.` : "";

    if (avg >= 80) return `Prestasi sangat cemerlang. Teruskan usaha yang konsisten.${weak}`;
    if (avg >= 65) return `Prestasi baik. Tingkatkan sedikit lagi untuk capai keputusan lebih cemerlang.${weak}`;
    if (avg >= 50) return `Prestasi sederhana. Perlu tambah latihan dan pengurusan masa belajar.${weak}`;
    return `Prestasi perlu dipertingkatkan. Disarankan buat ulangkaji berkala dan dapatkan bimbingan guru.${weak}`;
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const student_id = String(body?.student_id ?? "").trim();
        const class_id = String(body?.class_id ?? "").trim();
        const teacher_id = String(body?.teacher_id ?? "").trim();
        const exam_id = String(body?.exam_id ?? "").trim();
        const mode = String(body?.mode ?? "manual").trim();
        const manualComment = String(body?.comment ?? "").trim();

        if (!student_id || !class_id || !teacher_id || !exam_id) {
            return NextResponse.json(
                { message: "student_id, class_id, teacher_id, exam_id diperlukan" },
                { status: 400 }
            );
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        // Use approved results for report card
        const { data: results, error: rErr } = await supabase
            .from("stg_results")
            .select("total, subject_id")
            .eq("student_id", student_id)
            .eq("exam_id", exam_id)
            .eq("status", "approved");

        if (rErr) {
            return NextResponse.json({ message: rErr.message }, { status: 500 });
        }

        if (!results || results.length === 0) {
            return NextResponse.json(
                { message: "Tiada keputusan diluluskan untuk peperiksaan ini" },
                { status: 400 }
            );
        }

        const totals = results.map((r: any) => Number(r.total ?? 0));
        const average = totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length);

        // weakest subject name (optional)
        let weakestSubjectName: string | null = null;
        try {
            const minIdx = totals.indexOf(Math.min(...totals));
            const weakestSubjectId = results[minIdx]?.subject_id;
            if (weakestSubjectId) {
                const { data: subj } = await supabase
                    .from("stg_subjects")
                    .select("subject_name")
                    .eq("subject_id", weakestSubjectId)
                    .single();
                weakestSubjectName = subj?.subject_name ?? null;
            }
        } catch {
            weakestSubjectName = null;
        }

        const comment =
            mode === "ai"
                ? buildAiComment({ average, weakestSubject: weakestSubjectName })
                : manualComment;

        if (!comment) {
            return NextResponse.json(
                { message: "Comment diperlukan" },
                { status: 400 }
            );
        }

        // class ranking (by average across approved results)
        const { data: classmates } = await supabase
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);

        const classStudentIds = (classmates ?? [])
            .map((s: any) => s.student_id as string)
            .filter(Boolean);

        const { data: classResults } = classStudentIds.length
            ? await supabase
                  .from("stg_results")
                  .select("student_id, total")
                  .eq("exam_id", exam_id)
                  .eq("status", "approved")
                  .in("student_id", classStudentIds)
            : { data: [] as any[] };

        const totalsByStudent = new Map<string, number[]>();
        for (const row of classResults ?? []) {
            const sid = row.student_id as string;
            const arr = totalsByStudent.get(sid) ?? [];
            arr.push(Number(row.total ?? 0));
            totalsByStudent.set(sid, arr);
        }

        const averages = Array.from(totalsByStudent.entries()).map(([sid, arr]) => {
            const avg = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
            return { sid, avg };
        });

        averages.sort((a, b) => b.avg - a.avg);
        const class_position = averages.findIndex((x) => x.sid === student_id) + 1;

        // Replace existing report_card for this student+exam
        await supabase
            .from("stg_report_cards")
            .delete()
            .eq("student_id", student_id)
            .eq("exam_id", exam_id);

        const { error: insErr } = await supabase.from("stg_report_cards").insert({
            student_id,
            class_id,
            teacher_id,
            exam_id,
            average_mark: Number.isFinite(average) ? average : null,
            class_position: class_position > 0 ? class_position : null,
            ai_comment: comment,
            generated_date: new Date().toISOString(),
        });

        if (insErr) {
            return NextResponse.json({ message: insErr.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            average_mark: average,
            class_position: class_position || null,
            comment,
        });
    } catch (err: any) {
        console.error("POST report card comment FAILED:", err);
        return NextResponse.json(
            { message: err.message || "Ralat pelayan" },
            { status: 500 }
        );
    }
}
