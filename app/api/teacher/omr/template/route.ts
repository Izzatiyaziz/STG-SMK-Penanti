import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type AnswerRow = {
  question_no: number | null;
  correct_answer: string | null;
};

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
    const exam_id = toId(searchParams.get("exam_id"));
    const subject_id = toId(searchParams.get("subject_id"));
    const class_id = toId(searchParams.get("class_id"));

    if (!exam_id || !subject_id || !class_id) {
      return NextResponse.json(
        { message: "exam_id, subject_id, class_id diperlukan" },
        { status: 400 }
      );
    }

    const { data: assignment, error: assignErr } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("teacher_subject_id")
      .eq("teacher_id", guard.session.user_id)
      .eq("subject_id", subject_id)
      .eq("class_id", class_id)
      .limit(1);

    if (assignErr) {
      return NextResponse.json({ message: assignErr.message }, { status: 500 });
    }
    if (!Array.isArray(assignment) || assignment.length === 0) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    const { data: answerRows, error: answerErr } = await supabaseAdmin
      .from("stg_answer_schema")
      .select("question_no, correct_answer")
      .eq("exam_id", exam_id)
      .eq("subject_id", subject_id)
      .order("question_no", { ascending: true });

    if (answerErr) {
      return NextResponse.json({ message: answerErr.message }, { status: 500 });
    }

    const validRows = (answerRows ?? []).filter((row: AnswerRow) => {
      const question_no = toNumber(row?.question_no);
      const correct_answer = String(row?.correct_answer ?? "").trim().toUpperCase();
      return question_no > 0 && ["A", "B", "C", "D"].includes(correct_answer);
    });

    const { data: examRow } = await supabaseAdmin
      .from("stg_exams")
      .select("subject_settings")
      .eq("exam_id", exam_id)
      .maybeSingle();

    const subjectSettings =
      examRow &&
      typeof examRow === "object" &&
      "subject_settings" in examRow &&
      examRow.subject_settings &&
      typeof examRow.subject_settings === "object"
        ? (examRow.subject_settings as Record<string, unknown>)
        : {};

    const settingsForSubject =
      subjectSettings && typeof subjectSettings === "object"
        ? (subjectSettings[subject_id] as Record<string, unknown> | undefined)
        : undefined;

    const configuredQuestionCount = toNumber(settingsForSubject?.objective_questions);
    const questionNumbers = validRows.map((row: AnswerRow) => toNumber(row.question_no));
    const question_count = validRows.length || configuredQuestionCount;

    return NextResponse.json({
      success: true,
      question_count,
      question_numbers: questionNumbers,
      configured_question_count: configuredQuestionCount,
      has_answer_scheme: validRows.length > 0,
      max_supported_questions: 80,
    });
  } catch (err) {
    console.error("GET teacher/omr/template FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
