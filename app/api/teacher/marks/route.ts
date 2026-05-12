import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function gradeFromTotal(total: number) {
    if (total >= 80) return "A";
    if (total >= 65) return "B";
    if (total >= 50) return "C";
    if (total >= 40) return "D";
    return "E";
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const teacher_id = String(body?.teacher_id ?? "").trim();
        const class_id = String(body?.class_id ?? "").trim();
        const subject_id = String(body?.subject_id ?? "").trim();
        const exam_id = String(body?.exam_id ?? "").trim();
        const marks = Array.isArray(body?.marks) ? body.marks : [];

        if (!teacher_id || !class_id || !subject_id || !exam_id) {
            return NextResponse.json(
                { message: "teacher_id, class_id, subject_id, exam_id diperlukan" },
                { status: 400 }
            );
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: assignment, error: assignErr } = await supabase
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

        // Enforce deadline (per exam + subject settings)
        const { data: exam, error: examErr } = await supabase
            .from("stg_exams")
            .select("subject_settings")
            .eq("exam_id", exam_id)
            .single();

        if (examErr) {
            return NextResponse.json({ message: examErr.message }, { status: 500 });
        }

        const settingsAll =
            exam?.subject_settings && typeof exam.subject_settings === "object"
                ? (exam.subject_settings as Record<string, unknown>)
                : {};
        const subjectSettingsRaw = settingsAll[subject_id];
        const subjectSettings =
            subjectSettingsRaw && typeof subjectSettingsRaw === "object"
                ? (subjectSettingsRaw as Record<string, unknown>)
                : {};
        const objectiveMax = Number(subjectSettings.objective_max ?? 0);

        const deadlineRaw = subjectSettings.deadline;
        const deadline =
            typeof deadlineRaw === "string" ? deadlineRaw.trim() : "";

        if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
            const today = new Date().toISOString().slice(0, 10);
            if (today > deadline) {
                return NextResponse.json(
                    {
                        message: `Tarikh akhir penghantaran telah tamat (${deadline}). Sila hubungi Panitia Subjek.`,
                    },
                    { status: 403 }
                );
            }
        }

        const { data: students, error: sErr } = await supabase
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);

        if (sErr) {
            return NextResponse.json({ message: sErr.message }, { status: 500 });
        }

        const studentIds = (students ?? [])
            .map((s: { student_id?: unknown }) => String(s.student_id ?? "").trim())
            .filter(Boolean);

        const markByStudent = new Map<string, number>();
        const objectiveByStudent = new Map<string, number>();
        for (const m of marks) {
            const sid = String(m?.student_id ?? "").trim();
            const val = Number(m?.subjective_mark ?? 0);
            const objectiveVal = Number(m?.objective_mark ?? 0);
            if (sid) markByStudent.set(sid, val);
            if (sid && Number.isFinite(objectiveVal)) objectiveByStudent.set(sid, objectiveVal);
        }

        for (const [studentId, objectiveMark] of objectiveByStudent) {
            if (objectiveMark < 0 || (objectiveMax > 0 && objectiveMark > objectiveMax)) {
                return NextResponse.json(
                    { message: `Markah objektif tidak sah untuk pelajar ${studentId}` },
                    { status: 400 }
                );
            }
        }

        // Save subjective marks + create/update results
        for (const studentId of studentIds) {
            const subjective_mark = markByStudent.get(studentId) ?? 0;

            // upsert subjective mark (manual)
            const { data: existing } = await supabase
                .from("stg_subjective_marks")
                .select("subjective_id")
                .eq("teacher_id", teacher_id)
                .eq("student_id", studentId)
                .eq("subject_id", subject_id)
                .eq("exam_id", exam_id)
                .maybeSingle();

            let subjective_id: string | null = null;
            if (existing?.subjective_id) {
                const { error: uErr } = await supabase
                    .from("stg_subjective_marks")
                    .update({
                        subjective_mark,
                        input_date: new Date().toISOString(),
                    })
                    .eq("subjective_id", existing.subjective_id);
                if (uErr) throw uErr;
                subjective_id = existing.subjective_id;
            } else {
                const { data: created, error: cErr } = await supabase
                    .from("stg_subjective_marks")
                    .insert({
                        teacher_id,
                        student_id: studentId,
                        subject_id,
                        exam_id,
                        subjective_mark,
                    })
                    .select("subjective_id")
                    .single();
                if (cErr) throw cErr;
                subjective_id = created?.subjective_id ?? null;
            }

            const manualObjective = objectiveByStudent.get(studentId);
            let omr: { omr_scan_id?: string | null; objective_total_mark?: number | null } | null = null;

            if (manualObjective !== undefined) {
                const { data: manualScan, error: manualScanErr } = await supabase
                    .from("stg_omr_scans")
                    .insert({
                        student_id: studentId,
                        subject_id,
                        exam_id,
                        objective_total_mark: manualObjective,
                        scan_date: new Date().toISOString(),
                    })
                    .select("omr_scan_id, objective_total_mark")
                    .single();

                if (manualScanErr) throw manualScanErr;
                omr = manualScan;
            } else {
                // objective from OMR scans if exists
                const { data: latestOmr } = await supabase
                    .from("stg_omr_scans")
                    .select("omr_scan_id, objective_total_mark")
                    .eq("student_id", studentId)
                    .eq("subject_id", subject_id)
                    .eq("exam_id", exam_id)
                    .order("scan_date", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                omr = latestOmr;
            }

            const objective_total = Number(omr?.objective_total_mark ?? 0);
            const total = objective_total + subjective_mark;
            const grade = gradeFromTotal(total);

            const { data: existingResult } = await supabase
                .from("stg_results")
                .select("result_id")
                .eq("student_id", studentId)
                .eq("subject_id", subject_id)
                .eq("exam_id", exam_id)
                .maybeSingle();

            if (existingResult?.result_id) {
                const { error: rErr } = await supabase
                    .from("stg_results")
                    .update({
                        omr_scan_id: omr?.omr_scan_id ?? null,
                        subjective_id,
                        total,
                        grade,
                        status: "pending",
                    })
                    .eq("result_id", existingResult.result_id);
                if (rErr) throw rErr;
            } else {
                const { error: iErr } = await supabase.from("stg_results").insert({
                    student_id: studentId,
                    subject_id,
                    exam_id,
                    omr_scan_id: omr?.omr_scan_id ?? null,
                    subjective_id,
                    total,
                    grade,
                    status: "pending",
                });
                if (iErr) throw iErr;
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("POST teacher marks FAILED:", err);
        const message = err instanceof Error ? err.message : "Ralat pelayan";
        return NextResponse.json(
            { message },
            { status: 500 }
        );
    }
}
