import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

async function isCoordinatorForSubject(params: {
    coordinator_teacher_id: string;
    subject_id: string;
}) {
    const { coordinator_teacher_id, subject_id } = params;
    const { data, error } = await supabase
        .from("stg_subject_coordinators")
        .select("subject_coordinator_id")
        .eq("teacher_id", coordinator_teacher_id)
        .eq("subject_id", subject_id)
        .limit(1);

    if (error) return false;
    return Array.isArray(data) && data.length > 0;
}

function safeNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function safeDateString(v: unknown) {
    const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
    // Expect YYYY-MM-DD, keep as-is if matches.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return "";
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const coordinator_teacher_id = toId(body?.coordinator_teacher_id);
        const exam_id = toId(body?.exam_id);
        const subject_id = toId(body?.subject_id);

        if (!coordinator_teacher_id || !exam_id || !subject_id) {
            return NextResponse.json(
                { message: "coordinator_teacher_id, exam_id, subject_id diperlukan" },
                { status: 400 }
            );
        }

        const ok = await isCoordinatorForSubject({
            coordinator_teacher_id,
            subject_id,
        });
        if (!ok) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const objective_questions = safeNumber(body?.objective_questions);
        const objective_max = safeNumber(body?.objective_max);
        const subjective_questions = safeNumber(body?.subjective_questions);
        const subjective_max = safeNumber(body?.subjective_max);
        const deadline = safeDateString(body?.deadline);

        const { data: exam, error: examErr } = await supabase
            .from("stg_exams")
            .select("exam_id, subject_settings")
            .eq("exam_id", exam_id)
            .single();

        if (examErr || !exam) {
            return NextResponse.json(
                { message: "Peperiksaan tidak dijumpai" },
                { status: 404 }
            );
        }

        const current =
            exam.subject_settings && typeof exam.subject_settings === "object"
                ? (exam.subject_settings as Record<string, unknown>)
                : {};

        const subjectCurrentRaw = current[subject_id];
        const subjectCurrent =
            subjectCurrentRaw && typeof subjectCurrentRaw === "object"
                ? (subjectCurrentRaw as Record<string, unknown>)
                : {};

        const nextSubjectSettings: Record<string, unknown> = { ...subjectCurrent };

        if (objective_questions !== null) nextSubjectSettings.objective_questions = objective_questions;
        if (objective_max !== null) nextSubjectSettings.objective_max = objective_max;
        if (subjective_questions !== null) nextSubjectSettings.subjective_questions = subjective_questions;
        if (subjective_max !== null) nextSubjectSettings.subjective_max = subjective_max;
        if (deadline) nextSubjectSettings.deadline = deadline;

        const nextAll = { ...current, [subject_id]: nextSubjectSettings };

        const { error: updateErr } = await supabase
            .from("stg_exams")
            .update({ subject_settings: nextAll })
            .eq("exam_id", exam_id);

        if (updateErr) {
            return NextResponse.json({ message: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, subject_settings: nextSubjectSettings });
    } catch (err) {
        console.error("POST coordinator exam-subject-settings FAILED:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

