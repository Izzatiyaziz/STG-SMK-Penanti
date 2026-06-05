import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";
import {
  computeMarkSummary,
  getGradeTemplateForClass,
  getPrimaryOmrComponent,
} from "@/lib/marking-template";
import { gradeFromTotal } from "@/lib/grade-utils";

export const runtime = "nodejs";

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeOption(v: unknown) {
  const u = String(v ?? "").trim().toUpperCase();
  return ["A", "B", "C", "D"].includes(u) ? u : "";
}


export async function PATCH(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const omr_scan_id = toId(body?.omr_scan_id);
    const student_id = toId(body?.student_id);
    const subject_id = toId(body?.subject_id);
    const exam_id = toId(body?.exam_id);
    const class_id = toId(body?.class_id);
    const overrides = Array.isArray(body?.overrides) ? body.overrides : [];

    if (!omr_scan_id || !student_id || !subject_id || !exam_id || !class_id) {
      return NextResponse.json({ message: "omr_scan_id, student_id, subject_id, exam_id, class_id diperlukan" }, { status: 400 });
    }
    if (overrides.length === 0) {
      return NextResponse.json({ message: "Tiada jawapan untuk disemak" }, { status: 400 });
    }

    // Verify teacher has access to this class+subject
    const { data: assignment, error: assignErr } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("teacher_subject_id")
      .eq("teacher_id", guard.session.user_id)
      .eq("subject_id", subject_id)
      .eq("class_id", class_id)
      .limit(1);

    if (assignErr) return NextResponse.json({ message: assignErr.message }, { status: 500 });
    if (!Array.isArray(assignment) || assignment.length === 0) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    // Verify scan belongs to this student/subject/exam
    const { data: scan } = await supabaseAdmin
      .from("stg_omr_scans")
      .select("omr_scan_id")
      .eq("omr_scan_id", omr_scan_id)
      .eq("student_id", student_id)
      .eq("subject_id", subject_id)
      .eq("exam_id", exam_id)
      .maybeSingle();

    if (!scan) return NextResponse.json({ message: "Imbasan tidak dijumpai atau akses ditolak" }, { status: 404 });

    // Update each overridden answer
    for (const override of overrides) {
      const question_no = toNumber(override?.question_no);
      const selected = normalizeOption(override?.selected_option);
      if (!question_no || !selected) continue;

      // Get the expected option to determine correct/wrong
      const { data: answerRow } = await supabaseAdmin
        .from("stg_omr_scan_answers")
        .select("expected_option")
        .eq("omr_scan_id", omr_scan_id)
        .eq("question_no", question_no)
        .maybeSingle();

      const expected = normalizeOption((answerRow as { expected_option?: unknown } | null)?.expected_option);
      const newStatus = expected && selected === expected ? "correct" : "wrong";

      await supabaseAdmin
        .from("stg_omr_scan_answers")
        .update({ detected_option: selected, status: newStatus })
        .eq("omr_scan_id", omr_scan_id)
        .eq("question_no", question_no);
    }

    // Recalculate correct count from all answers for this scan
    const { data: allAnswers } = await supabaseAdmin
      .from("stg_omr_scan_answers")
      .select("status")
      .eq("omr_scan_id", omr_scan_id);

    const answers = Array.isArray(allAnswers) ? allAnswers : [];
    const correctCount = answers.filter((a: { status?: unknown }) => String(a?.status) === "correct").length;
    const totalQuestions = answers.length;

    // Get mark template info
    const [{ data: examRow }, { data: classRow }, { data: subjectRow }] = await Promise.all([
      supabaseAdmin.from("stg_exams").select("subject_settings").eq("exam_id", exam_id).maybeSingle(),
      supabaseAdmin.from("stg_classes").select("grade").eq("class_id", class_id).maybeSingle(),
      supabaseAdmin.from("stg_subjects").select("subject_name").eq("subject_id", subject_id).maybeSingle(),
    ]);

    const templateInfo = getGradeTemplateForClass({
      subjectSettings:
        examRow && typeof examRow === "object" && "subject_settings" in examRow && examRow.subject_settings
          ? (examRow.subject_settings as Record<string, unknown>)
          : {},
      subjectId: subject_id,
      subjectName: typeof subjectRow?.subject_name === "string" ? subjectRow.subject_name : "",
      grade: typeof classRow?.grade === "number" ? classRow.grade : Number(classRow?.grade ?? 0),
    });
    const primaryOmrComponent = getPrimaryOmrComponent(templateInfo.template);
    const objectiveMax = toNumber(primaryOmrComponent?.max_mark) || totalQuestions;
    const objectiveQuestions = toNumber(primaryOmrComponent?.question_count) || totalQuestions;
    const objective_total_mark =
      objectiveQuestions > 0 ? Math.round((correctCount / objectiveQuestions) * objectiveMax) : 0;

    // Update scan mark
    await supabaseAdmin
      .from("stg_omr_scans")
      .update({ objective_total_mark })
      .eq("omr_scan_id", omr_scan_id);

    // Update mark component
    const componentKey = primaryOmrComponent?.key ?? "objective";
    await supabaseAdmin
      .from("stg_mark_components")
      .update({ mark: objective_total_mark, input_date: new Date().toISOString() })
      .eq("student_id", student_id)
      .eq("subject_id", subject_id)
      .eq("exam_id", exam_id)
      .eq("component_key", componentKey);

    // Recalculate result
    const { data: componentRows } = await supabaseAdmin
      .from("stg_mark_components")
      .select("component_key, mark")
      .eq("student_id", student_id)
      .eq("subject_id", subject_id)
      .eq("exam_id", exam_id);

    const marksByKey: Record<string, number> = {};
    for (const row of Array.isArray(componentRows) ? componentRows : []) {
      if (!row || typeof row !== "object") continue;
      const key = toId((row as { component_key?: unknown }).component_key);
      if (!key) continue;
      marksByKey[key] = toNumber((row as { mark?: unknown }).mark);
    }
    marksByKey[componentKey] = objective_total_mark;

    const total = computeMarkSummary(templateInfo.template, marksByKey).percentage;
    const grade = gradeFromTotal(total);

    await supabaseAdmin
      .from("stg_results")
      .update({ total, grade })
      .eq("student_id", student_id)
      .eq("subject_id", subject_id)
      .eq("exam_id", exam_id);

    // Audit trail: log OMR review event (fire-and-forget)
    void Promise.resolve(supabaseAdmin.from("stg_sessions").insert({
      user_id: guard.session.user_id,
      role: "teacher",
      action: `Semak OMR: Pelajar ${student_id} | Subject: ${subject_id} | Exam: ${exam_id} | ${overrides.length} soalan`,
    })).catch(() => {});

    return NextResponse.json({
      success: true,
      correct: correctCount,
      total_questions: totalQuestions,
      objective_total_mark,
    });
  } catch (err) {
    console.error("PATCH teacher/omr/review FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
