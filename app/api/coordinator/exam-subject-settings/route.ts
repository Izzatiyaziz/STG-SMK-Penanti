import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";
import {
  serializeTemplateForStorage,
  sanitizeGradeTemplate,
} from "@/lib/marking-template";

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

function safeDateString(v: unknown) {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("subject coordinator");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const coordinator_teacher_id = toId(body?.coordinator_teacher_id);
    const exam_id = toId(body?.exam_id);
    const subject_id = toId(body?.subject_id);

    if (!coordinator_teacher_id || !exam_id || !subject_id) {
      return NextResponse.json(
        { message: "coordinator_teacher_id, exam_id, subject_id diperlukan" },
        { status: 400 },
      );
    }

    if (coordinator_teacher_id !== guard.session.user_id) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    const ok = await isCoordinatorForSubject({
      coordinator_teacher_id,
      subject_id,
    });
    if (!ok) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    const requestedDeadlines =
      body?.deadlines && typeof body.deadlines === "object"
        ? (body.deadlines as Record<string, unknown>)
        : {};
    const lowerDeadline = safeDateString(requestedDeadlines.lower);
    const upperDeadline = safeDateString(requestedDeadlines.upper);
    const requestedTemplates =
      body?.grade_templates && typeof body.grade_templates === "object"
        ? (body.grade_templates as Record<string, unknown>)
        : {};

    const { data: subjectRow } = await supabase
      .from("stg_subjects")
      .select("subject_name")
      .eq("subject_id", subject_id)
      .maybeSingle();

    const subjectName =
      typeof subjectRow?.subject_name === "string" ? subjectRow.subject_name : "";

    const lowerTemplate = serializeTemplateForStorage(
      sanitizeGradeTemplate("lower", requestedTemplates.lower, subjectName),
    );
    const upperTemplate = serializeTemplateForStorage(
      sanitizeGradeTemplate("upper", requestedTemplates.upper, subjectName),
    );

    const { data: exam, error: examErr } = await supabase
      .from("stg_exams")
      .select("exam_id, subject_settings")
      .eq("exam_id", exam_id)
      .single();

    if (examErr || !exam) {
      return NextResponse.json({ message: "Peperiksaan tidak dijumpai" }, { status: 404 });
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

    if (!lowerDeadline && !upperDeadline) {
      const nextAll = { ...current };
      delete nextAll[subject_id];

      const [{ error: updateErr }, { error: answerSchemaErr }] = await Promise.all([
        supabase
          .from("stg_exams")
          .update({ subject_settings: nextAll })
          .eq("exam_id", exam_id),
        supabaseAdmin
          .from("stg_answer_schema")
          .delete()
          .eq("exam_id", exam_id)
          .eq("subject_id", subject_id),
      ]);

      if (updateErr) {
        return NextResponse.json({ message: updateErr.message }, { status: 500 });
      }

      if (answerSchemaErr) {
        return NextResponse.json({ message: answerSchemaErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        cancelled: true,
        subject_settings: null,
      });
    }

    const nextSubjectSettings: Record<string, unknown> = {
      ...subjectCurrent,
      deadline: lowerDeadline || upperDeadline || null,
      deadlines: {
        lower: lowerDeadline || null,
        upper: upperDeadline || null,
      },
      grade_templates: {
        lower: lowerTemplate,
        upper: upperTemplate,
      },
      objective_questions:
        lowerTemplate.components.find((component) => component.type === "omr")?.question_count ?? 0,
      objective_max: lowerTemplate.components
        .filter((component) => component.type === "omr")
        .reduce((sum, component) => sum + Number(component.max_mark ?? 0), 0),
      subjective_max: lowerTemplate.components
        .filter((component) => component.type === "manual")
        .reduce((sum, component) => sum + Number(component.max_mark ?? 0), 0),
    };

    const nextAll = { ...current, [subject_id]: nextSubjectSettings };

    const { error: updateErr } = await supabase
      .from("stg_exams")
      .update({ subject_settings: nextAll })
      .eq("exam_id", exam_id);

    if (updateErr) {
      return NextResponse.json({ message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subject_settings: nextSubjectSettings,
    });
  } catch (err) {
    console.error("POST coordinator exam-subject-settings FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
