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

type StudentRow = { id: string; name: string };

function average(arr: number[]) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const teacher_id = toId(body?.teacher_id);
        const exam_id = toId(body?.exam_id);

        if (!teacher_id || !exam_id) {
            return NextResponse.json(
                { message: "teacher_id dan exam_id diperlukan" },
                { status: 400 }
            );
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        // Verify class teacher and fetch class
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

        const [{ data: classInfo }, { data: exam }, { data: students }, { data: existingCards }] =
            await Promise.all([
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
                    .from("stg_students")
                    .select("student_id, fullname")
                    .eq("class_id", class_id)
                    .order("fullname", { ascending: true }),
                supabase
                    .from("stg_report_cards")
                    .select("student_id, ai_comment")
                    .eq("class_id", class_id)
                    .eq("exam_id", exam_id),
            ]);

        const studentList: StudentRow[] = (Array.isArray(students) ? students : [])
            .map((s: any) => ({
                id: toId(s?.student_id),
                name: String(s?.fullname ?? "").trim(),
            }))
            .filter((s: StudentRow) => Boolean(s.id));

        if (studentList.length === 0) {
            return NextResponse.json(
                { message: "Tiada pelajar dalam kelas", data: [] },
                { status: 400 }
            );
        }

        const studentIds = studentList.map((s) => s.id);

        const { data: allResults, error: rErr } = await supabase
            .from("stg_results")
            .select("student_id, subject_id, total, grade, status, subjective_id")
            .eq("exam_id", exam_id)
            .in("student_id", studentIds);

        if (rErr) {
            return NextResponse.json({ message: rErr.message }, { status: 500 });
        }

        const pendingOrRejected = (Array.isArray(allResults) ? allResults : []).filter((r: any) => {
            const hasSubjective = Boolean(r?.subjective_id);
            const status = String(r?.status ?? "pending").trim();
            return hasSubjective && (status === "pending" || status === "rejected");
        });

        if (pendingOrRejected.length > 0) {
            return NextResponse.json(
                {
                    message:
                        "Markah belum diluluskan sepenuhnya. Sila pastikan semua subjek untuk kelas ini sudah diluluskan oleh Penyelaras.",
                    pending: pendingOrRejected.length,
                },
                { status: 409 }
            );
        }

        const approvedResults = (Array.isArray(allResults) ? allResults : []).filter((r: any) => {
            const hasSubjective = Boolean(r?.subjective_id);
            const status = String(r?.status ?? "pending").trim();
            return hasSubjective && status === "approved";
        });

        const approvedByStudent = new Map<string, any[]>();
        for (const r of approvedResults) {
            const sid = toId(r?.student_id);
            if (!sid) continue;
            if (!approvedByStudent.has(sid)) approvedByStudent.set(sid, []);
            approvedByStudent.get(sid)!.push(r);
        }

        const missing = studentList.filter((s) => (approvedByStudent.get(s.id) ?? []).length === 0);
        if (missing.length > 0) {
            return NextResponse.json(
                {
                    message:
                        "Sebahagian pelajar tiada keputusan diluluskan untuk peperiksaan ini. Tidak boleh jana kad laporan.",
                    missing_students: missing.slice(0, 10),
                },
                { status: 409 }
            );
        }

        const subjectIds = Array.from(
            new Set(approvedResults.map((r: any) => toId(r?.subject_id)).filter(Boolean))
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
            const id = toId((s as any).subject_id);
            const name = String((s as any).subject_name ?? "").trim();
            if (id) subjectNameById.set(id, name);
        }

        const existingCommentByStudentId = new Map<string, string>();
        for (const c of Array.isArray(existingCards) ? existingCards : []) {
            if (!c || typeof c !== "object") continue;
            const sid = toId((c as any).student_id);
            const comment = String((c as any).ai_comment ?? "").trim();
            if (sid && comment) existingCommentByStudentId.set(sid, comment);
        }

        const computed = studentList.map((s) => {
            const rs = approvedByStudent.get(s.id) ?? [];
            const subjectsOut = rs
                .map((r: any) => {
                    const subjectId = toId(r?.subject_id);
                    return {
                        subject_id: subjectId,
                        name: subjectNameById.get(subjectId) ?? "",
                        mark: toNumber(r?.total),
                        grade: String(r?.grade ?? "").trim(),
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            const avg = average(subjectsOut.map((x) => x.mark));
            return {
                student_id: s.id,
                student_name: s.name,
                subjects: subjectsOut,
                average_mark: avg,
                comment: existingCommentByStudentId.get(s.id) ?? "",
            };
        });

        // ranking by average
        const ranked = [...computed].sort((a, b) => b.average_mark - a.average_mark);
        const positionByStudent = new Map<string, number>();
        for (let i = 0; i < ranked.length; i++) {
            positionByStudent.set(ranked[i].student_id, i + 1);
        }

        // Replace report cards for this class+exam (preserve existing comment in computed)
        await supabase.from("stg_report_cards").delete().eq("class_id", class_id).eq("exam_id", exam_id);

        const payload = computed.map((s) => ({
            student_id: s.student_id,
            class_id,
            teacher_id,
            exam_id,
            average_mark: Number.isFinite(s.average_mark) ? s.average_mark : null,
            class_position: positionByStudent.get(s.student_id) ?? null,
            ai_comment: s.comment || null,
            generated_date: new Date().toISOString(),
        }));

        const { error: insErr } = await supabase.from("stg_report_cards").insert(payload);
        if (insErr) {
            return NextResponse.json({ message: insErr.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            class: {
                id: class_id,
                name: classInfo?.class_name ?? "",
                grade: classInfo?.grade ?? null,
            },
            exam: exam
                ? { id: exam.exam_id, name: exam.exam_name, academic_year: exam.academic_year }
                : { id: exam_id, name: "", academic_year: "" },
            students: computed.map((s) => ({
                ...s,
                position: positionByStudent.get(s.student_id) ?? null,
            })),
        });
    } catch (err: any) {
        console.error("POST report-cards generate FAILED:", err);
        return NextResponse.json(
            { message: err.message || "Ralat pelayan" },
            { status: 500 }
        );
    }
}
