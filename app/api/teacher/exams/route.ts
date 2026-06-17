import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type ClassRow = { class_id?: unknown; grade?: unknown };
type AnswerSchemaRow = { exam_id?: unknown; subject_id?: unknown; grade_group?: unknown };
type ExamRow = { exam_id?: unknown; exam_name?: unknown; academic_year?: unknown };

export async function GET() {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("subject_id, class_id")
      .eq("teacher_id", guard.session.user_id);

    if (assignmentError || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const classIds = Array.from(new Set(assignments.map((row) => String(row.class_id ?? "")).filter(Boolean)));
    const subjectIds = Array.from(new Set(assignments.map((row) => String(row.subject_id ?? "")).filter(Boolean)));
    const { data: classes } = classIds.length
      ? await supabaseAdmin.from("stg_classes").select("class_id, grade").in("class_id", classIds)
      : { data: [] };
    const gradeGroupByClassId = new Map(
      ((classes ?? []) as ClassRow[]).map((row) => [
        String(row.class_id),
        `tingkatan-${Number(row.grade)}`,
      ])
    );
    const allowedSubjectGradePairs = new Set(
      assignments.map((row) => `${String(row.subject_id)}:${gradeGroupByClassId.get(String(row.class_id)) ?? ""}`)
    );
    const { data: answerSchemas } = await supabaseAdmin
      .from("stg_answer_schema")
      .select("exam_id, subject_id, grade_group")
      .in("subject_id", subjectIds);
    const eligibleExamIds = Array.from(
      new Set(
        ((answerSchemas ?? []) as AnswerSchemaRow[])
          .filter((row) =>
            allowedSubjectGradePairs.has(`${String(row.subject_id)}:${String(row.grade_group ?? "")}`)
          )
          .map((row) => String(row.exam_id ?? ""))
          .filter(Boolean)
      )
    );

    if (eligibleExamIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from("stg_exams")
      .select("exam_id, exam_name, academic_year")
      .in("exam_id", eligibleExamIds)
      .order("academic_year", { ascending: false })
      .order("exam_name", { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json({
      data: ((data ?? []) as ExamRow[]).map((e) => ({
        id: e.exam_id,
        name: e.exam_name,
        year: e.academic_year,
      })),
    });
  } catch (err) {
    console.error("GET teacher exams FAILED:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

