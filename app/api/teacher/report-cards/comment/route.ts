import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import { getClientIp, isRequestBodyTooLarge, looksLikeXssAttempt, sanitizePlainText } from "@/lib/security";
import { logSecurityEvent } from "@/lib/security-events";

export const runtime = "nodejs";

type SubjectSummary = {
    subject_name: string;
    mark: number;
    grade: string;
};

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function gradeSummary(subjects: SubjectSummary[]) {
    const counts = new Map<string, number>();
    for (const subject of subjects) {
        const grade = String(subject.grade ?? "").trim().toUpperCase();
        if (!grade) continue;
        counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }

    return ["A", "B", "C", "D", "E", "F"]
        .filter((grade) => (counts.get(grade) ?? 0) > 0)
        .map((grade) => `${counts.get(grade)}${grade}`)
        .join(" ");
}

function buildPromptInput(params: {
    student: { student_id: string; full_name: string; ic_number: string; class_name: string; level: string };
    teacher: { teacher_id: string; full_name: string };
    exam: { exam_id: string; exam_name: string; academic_year: string };
    performance: {
        average_mark: number;
        class_position: number | null;
        total_students_in_class: number;
        grade_summary: string;
        strongest_subject: string | null;
        weakest_subject: string | null;
    };
    subjects: SubjectSummary[];
}) {
    return JSON.stringify(
        {
            task: "generate_student_report_comment",
            language: "ms-MY",
            output_style: {
                tone: "formal_encouraging",
                max_words: 45,
                sentences: 2,
                audience: "student_report_card",
            },
            school: {
                name: "SMK Penanti",
            },
            student: params.student,
            class_teacher: params.teacher,
            exam: params.exam,
            performance: params.performance,
            subjects: params.subjects.map((subject) => ({
                subject_name: subject.subject_name,
                mark: subject.mark,
                grade: subject.grade,
            })),
            rules: [
                "Tulis dalam Bahasa Melayu.",
                "Berikan komen ringkas, sesuai untuk slip keputusan pelajar.",
                "Nyatakan kekuatan utama berdasarkan prestasi sebenar.",
                "Nyatakan satu fokus penambahbaikan jika perlu.",
                "Jangan reka maklumat yang tiada dalam JSON.",
                "Jangan guna bullet points.",
                "Jangan beri penerangan tambahan.",
            ],
        },
        null,
        2
    );
}

async function generateAiComment(prompt_input: string) {
    const reportAiServiceUrl =
      process.env.REPORT_AI_SERVICE_URL ||
      process.env.OMR_SERVICE_URL ||
      "https://stg-smk-penanti-omr.fly.dev";
    const res = await fetch(`${reportAiServiceUrl}/report-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt_input }),
    });

    const json = await res.json();
    if (!res.ok) {
        throw new Error(String(json?.detail || json?.message || "Gagal jana komen AI"));
    }

    const ai_comment = String(json?.ai_comment ?? "").trim();
    if (!ai_comment) {
        throw new Error("JamAI tidak memulangkan ai_comment");
    }
    return ai_comment;
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        if (isRequestBodyTooLarge(req, 16_384)) {
            return NextResponse.json({ message: "Permintaan terlalu besar" }, { status: 413 });
        }

        const body = await req.json();
        const student_id = toId(body?.student_id);
        const class_id = toId(body?.class_id);
        const teacher_id = toId(body?.teacher_id);
        const exam_id = toId(body?.exam_id);
        const mode = String(body?.mode ?? "manual").trim().toLowerCase();
        const rawManualComment = String(body?.comment ?? "").trim();
        const manualComment = sanitizePlainText(rawManualComment, 1_000);
        if (looksLikeXssAttempt(rawManualComment)) {
            await logSecurityEvent({
                eventType: "xss_attempt",
                severity: "high",
                ipAddress: getClientIp(req),
                identifier: guard.session.user_id,
                role: "teacher",
                endpoint: "/api/teacher/report-cards/comment",
                details: { reason: "Markup mencurigakan dikesan pada komen kad laporan" },
            });
        }

        if (!student_id || !class_id || !teacher_id || !exam_id) {
            return NextResponse.json(
                { message: "student_id, class_id, teacher_id, exam_id diperlukan" },
                { status: 400 }
            );
        }

        if (!["manual", "ai"].includes(mode)) {
            return NextResponse.json({ message: "mode mesti manual atau ai" }, { status: 400 });
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: classTeacherRow, error: ctErr } = await supabase
            .from("stg_class_teachers")
            .select("teacher_id")
            .eq("class_id", class_id)
            .maybeSingle();

        if (ctErr) {
            return NextResponse.json({ message: ctErr.message }, { status: 500 });
        }

        const class_teacher_id = toId(classTeacherRow?.teacher_id);
        if (!class_teacher_id) {
            return NextResponse.json({ message: "Kelas ini tiada Guru Kelas" }, { status: 409 });
        }

        if (guard.session.user_id !== class_teacher_id) {
            return NextResponse.json(
                { message: "Hanya Guru Kelas boleh kemaskini report card" },
                { status: 403 }
            );
        }

        const [
            { data: studentRow },
            { data: classRow },
            { data: teacherRow },
            { data: examRow },
            { data: classmates },
        ] = await Promise.all([
            supabase
                .from("stg_students")
                .select("student_id, fullname, ic_number, level, class_id")
                .eq("student_id", student_id)
                .maybeSingle(),
            supabase
                .from("stg_classes")
                .select("class_id, class_name, grade")
                .eq("class_id", class_id)
                .maybeSingle(),
            supabase
                .from("stg_teachers")
                .select("teacher_id, fullname")
                .eq("teacher_id", class_teacher_id)
                .maybeSingle(),
            supabase
                .from("stg_exams")
                .select("exam_id, exam_name, academic_year")
                .eq("exam_id", exam_id)
                .maybeSingle(),
            supabase.from("stg_students").select("student_id").eq("class_id", class_id),
        ]);

        if (!studentRow || !classRow || !teacherRow || !examRow) {
            return NextResponse.json({ message: "Maklumat pelajar/kelas/guru/peperiksaan tidak lengkap" }, { status: 400 });
        }

        if (toId((studentRow as { class_id?: unknown }).class_id) !== class_id) {
            return NextResponse.json({ message: "Pelajar ini bukan dalam kelas tersebut" }, { status: 400 });
        }

        const { data: results, error: rErr } = await supabase
            .from("stg_results")
            .select("student_id, total, grade, subject_id")
            .eq("exam_id", exam_id)
            .eq("status", "approved")
            .in(
                "student_id",
                ((classmates ?? []) as Array<{ student_id?: string }>).map((row) => toId(row.student_id)).filter(Boolean)
            );

        if (rErr) {
            return NextResponse.json({ message: rErr.message }, { status: 500 });
        }

        const classStudentIds = ((classmates ?? []) as Array<{ student_id?: string }>)
            .map((row) => toId(row.student_id))
            .filter(Boolean);

        const studentResults = (results ?? []).filter((row: any) => toId(row?.student_id) === student_id);
        if (studentResults.length === 0) {
            return NextResponse.json(
                { message: "Tiada keputusan diluluskan untuk peperiksaan ini" },
                { status: 400 }
            );
        }

        const subjectIds = Array.from(new Set(studentResults.map((row: any) => toId(row?.subject_id)).filter(Boolean)));
        const { data: subjects, error: subjectsErr } = subjectIds.length
            ? await supabase.from("stg_subjects").select("subject_id, subject_name").in("subject_id", subjectIds)
            : { data: [], error: null };

        if (subjectsErr) {
            return NextResponse.json({ message: subjectsErr.message }, { status: 500 });
        }

        const subjectNameById = new Map<string, string>();
        for (const subject of Array.isArray(subjects) ? subjects : []) {
            const id = toId((subject as { subject_id?: unknown }).subject_id);
            const name = String((subject as { subject_name?: unknown }).subject_name ?? "").trim();
            if (id) subjectNameById.set(id, name);
        }

        const subjectSummaries = studentResults
            .map((row: any) => ({
                subject_name: subjectNameById.get(toId(row?.subject_id)) ?? "",
                mark: toNumber(row?.total),
                grade: String(row?.grade ?? "").trim().toUpperCase(),
            }))
            .sort((a, b) => a.subject_name.localeCompare(b.subject_name));

        const marks = subjectSummaries.map((row) => row.mark);
        const average_mark = marks.reduce((sum, mark) => sum + mark, 0) / Math.max(1, marks.length);

        const strongestSubject = [...subjectSummaries].sort((a, b) => b.mark - a.mark)[0] ?? null;
        const weakestSubject = [...subjectSummaries].sort((a, b) => a.mark - b.mark)[0] ?? null;

        const totalsByStudent = new Map<string, number[]>();
        for (const row of results ?? []) {
            const sid = toId((row as { student_id?: unknown }).student_id);
            if (!sid) continue;
            const arr = totalsByStudent.get(sid) ?? [];
            arr.push(toNumber((row as { total?: unknown }).total));
            totalsByStudent.set(sid, arr);
        }

        const classAverages = Array.from(totalsByStudent.entries())
            .map(([sid, arr]) => ({
                sid,
                avg: arr.reduce((sum, mark) => sum + mark, 0) / Math.max(1, arr.length),
            }))
            .sort((a, b) => b.avg - a.avg);

        const class_position = classAverages.findIndex((entry) => entry.sid === student_id) + 1;
        const total_students_in_class = classStudentIds.length;

        const prompt_input =
            mode === "ai"
                ? buildPromptInput({
                      student: {
                          student_id,
                          full_name: String((studentRow as { fullname?: unknown }).fullname ?? "").trim(),
                          ic_number: String((studentRow as { ic_number?: unknown }).ic_number ?? "").trim(),
                          class_name: String((classRow as { class_name?: unknown }).class_name ?? "").trim(),
                          level: String((studentRow as { level?: unknown }).level ?? (classRow as { grade?: unknown }).grade ?? "").trim(),
                      },
                      teacher: {
                          teacher_id: class_teacher_id,
                          full_name: String((teacherRow as { fullname?: unknown }).fullname ?? "").trim(),
                      },
                      exam: {
                          exam_id,
                          exam_name: String((examRow as { exam_name?: unknown }).exam_name ?? "").trim(),
                          academic_year: String((examRow as { academic_year?: unknown }).academic_year ?? "").trim(),
                      },
                      performance: {
                          average_mark: Number(average_mark.toFixed(2)),
                          class_position: class_position > 0 ? class_position : null,
                          total_students_in_class,
                          grade_summary: gradeSummary(subjectSummaries),
                          strongest_subject: strongestSubject?.subject_name ?? null,
                          weakest_subject: weakestSubject?.subject_name ?? null,
                      },
                      subjects: subjectSummaries,
                  })
                : null;

        const comment = sanitizePlainText(
            mode === "ai" ? await generateAiComment(prompt_input ?? "") : manualComment,
            1_000
        );
        if (!comment) {
            return NextResponse.json({ message: "Comment diperlukan" }, { status: 400 });
        }

        await supabase.from("stg_report_cards").delete().eq("student_id", student_id).eq("exam_id", exam_id);

        const { error: insErr } = await supabase.from("stg_report_cards").insert({
            student_id,
            class_id,
            teacher_id: class_teacher_id,
            exam_id,
            average_mark: Number.isFinite(average_mark) ? Number(average_mark.toFixed(2)) : null,
            class_position: class_position > 0 ? class_position : null,
            ai_comment: comment,
            prompt_input: prompt_input ? JSON.parse(prompt_input) : null,
            comment_mode: mode,
            generated_date: new Date().toISOString(),
        });

        if (insErr) {
            return NextResponse.json({ message: insErr.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            average_mark: Number(average_mark.toFixed(2)),
            class_position: class_position || null,
            prompt_input: prompt_input ? JSON.parse(prompt_input) : null,
            comment,
            mode,
        });
    } catch (err: any) {
        console.error("POST report card comment FAILED:", err);
        return NextResponse.json({ message: err.message || "Ralat pelayan" }, { status: 500 });
    }
}
