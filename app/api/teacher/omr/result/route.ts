import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";

export const runtime = "nodejs";

function toId(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

type AnswerRow = {
  question_no?: unknown;
  detected_option?: unknown;
  expected_option?: unknown;
  status?: unknown;
  confidence?: unknown;
};

export async function GET(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const studentId = toId(searchParams.get("student_id"));
    const classId = toId(searchParams.get("class_id"));
    const subjectId = toId(searchParams.get("subject_id"));
    const examId = toId(searchParams.get("exam_id"));

    if (!studentId || !classId || !subjectId || !examId) {
      return NextResponse.json({ source: "missing", message: "Maklumat keputusan OMR tidak lengkap" }, { status: 400 });
    }

    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("teacher_subject_id")
      .eq("teacher_id", guard.session.user_id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .limit(1);

    if (assignmentError) {
      return NextResponse.json({ message: assignmentError.message }, { status: 500 });
    }
    if (!Array.isArray(assignment) || assignment.length === 0) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    const { data: scan } = await supabaseAdmin
      .from("stg_omr_scans")
      .select("omr_scan_id, objective_total_mark, scan_date")
      .eq("student_id", studentId)
      .eq("subject_id", subjectId)
      .eq("exam_id", examId)
      .order("scan_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const scanId = toId(scan?.omr_scan_id);
    if (!scanId) {
      return NextResponse.json({
        source: "manual",
        message: "Guru ini mengisi markah objektif secara manual.",
      });
    }

    const { data: answerRows, error: answerError } = await supabaseAdmin
      .from("stg_omr_scan_answers")
      .select("question_no, detected_option, expected_option, status, confidence")
      .eq("omr_scan_id", scanId)
      .order("question_no", { ascending: true });

    if (answerError) {
      return NextResponse.json({ message: answerError.message }, { status: 500 });
    }

    const answers = (Array.isArray(answerRows) ? answerRows : []) as AnswerRow[];
    if (answers.length === 0) {
      return NextResponse.json({
        source: "manual",
        message: "Guru ini mengisi markah objektif secara manual.",
      });
    }

    const results = answers.map((answer) => ({
      question_no: toNumber(answer.question_no),
      detected_option: toId(answer.detected_option) || null,
      expected_option: toId(answer.expected_option) || null,
      status: toId(answer.status) || "unknown",
      confidence: toNumber(answer.confidence),
    }));
    const correct = results.filter((answer) => answer.status === "correct").length;
    const blank = results.filter((answer) => answer.status === "blank" || !answer.detected_option).length;
    const wrong = results.filter((answer) => answer.status === "wrong").length;
    const totalQuestions = results.length;
    const { data: componentRow } = await supabaseAdmin
      .from("stg_mark_components")
      .select("mark, max_mark, question_count")
      .eq("student_id", studentId)
      .eq("subject_id", subjectId)
      .eq("exam_id", examId)
      .eq("class_id", classId)
      .eq("teacher_id", guard.session.user_id)
      .eq("component_type", "omr")
      .limit(1)
      .maybeSingle();
    const currentComponentMark = toNumber(componentRow?.mark);
    const maxMark = toNumber(componentRow?.max_mark) || totalQuestions;
    const questionCount = toNumber(componentRow?.question_count) || totalQuestions;
    const scannedMark = questionCount > 0 ? Math.round((correct / questionCount) * maxMark) : correct;

    if (componentRow && currentComponentMark !== scannedMark) {
      return NextResponse.json({
        source: "manual",
        message: "Guru ini mengisi markah objektif secara manual.",
      });
    }

    return NextResponse.json({
      source: "omr",
      success: true,
      omr_scan_id: scanId,
      objective_total_mark: toNumber(scan?.objective_total_mark),
      total_questions: totalQuestions,
      correct,
      wrong,
      blank,
      ambiguous: 0,
      score_percent: totalQuestions > 0 ? Math.round((correct / totalQuestions) * 10000) / 100 : 0,
      results,
    });
  } catch (error) {
    console.error("GET teacher/omr/result FAILED:", error);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
