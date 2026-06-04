import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";
import { getGradeTemplateForClass, getPrimaryOmrComponent } from "@/lib/marking-template";
import { isAllowedClassForSubject } from "@/lib/subject-rules";

export const runtime = "nodejs";

function toId(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

type TeacherSubjectRow = {
  teacher_subject_id: string;
  subject_id: string;
  class_id: string;
};

type SubjectRow = {
  subject_id: string;
  subject_name: string;
};

type ClassRow = {
  class_id: string;
  class_name: string;
  grade: number | null;
};

export async function GET(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const teacherId = toId(searchParams.get("teacher_id"));
    const examId = toId(searchParams.get("exam_id"));

    if (!teacherId || !examId) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    if (teacherId !== guard.session.user_id) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    const { data: assignmentRows, error: assignmentError } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("teacher_subject_id, subject_id, class_id")
      .eq("teacher_id", teacherId);

    if (assignmentError) {
      return NextResponse.json({ message: assignmentError.message }, { status: 500 });
    }

    const assignments = (Array.isArray(assignmentRows) ? assignmentRows : []) as TeacherSubjectRow[];
    const subjectIds = Array.from(new Set(assignments.map((row) => row.subject_id).filter(Boolean)));
    const classIds = Array.from(new Set(assignments.map((row) => row.class_id).filter(Boolean)));

    const [{ data: examRow }, { data: subjectRows }, { data: classRows }] = await Promise.all([
      supabaseAdmin
        .from("stg_exams")
        .select("subject_settings")
        .eq("exam_id", examId)
        .maybeSingle(),
      subjectIds.length
        ? supabaseAdmin
            .from("stg_subjects")
            .select("subject_id, subject_name")
            .in("subject_id", subjectIds)
        : Promise.resolve({ data: [] }),
      classIds.length
        ? supabaseAdmin
            .from("stg_classes")
            .select("class_id, class_name, grade")
            .in("class_id", classIds)
        : Promise.resolve({ data: [] }),
    ]);

    const subjectSettings =
      examRow &&
      typeof examRow === "object" &&
      "subject_settings" in examRow &&
      examRow.subject_settings &&
      typeof examRow.subject_settings === "object"
        ? (examRow.subject_settings as Record<string, unknown>)
        : {};

    const subjectById = new Map(
      ((Array.isArray(subjectRows) ? subjectRows : []) as SubjectRow[]).map((subject) => [
        subject.subject_id,
        subject,
      ]),
    );
    const classById = new Map(
      ((Array.isArray(classRows) ? classRows : []) as ClassRow[]).map((classItem) => [
        classItem.class_id,
        classItem,
      ]),
    );

    const data = assignments
      .map((assignment) => {
        const subject = subjectById.get(assignment.subject_id);
        const classItem = classById.get(assignment.class_id);
        if (!isAllowedClassForSubject(subject?.subject_name ?? "", classItem?.grade)) return null;

        const templateInfo = getGradeTemplateForClass({
          subjectSettings,
          subjectId: assignment.subject_id,
          subjectName: subject?.subject_name ?? "",
          grade: toNumber(classItem?.grade ?? 0),
        });
        const primaryOmr = getPrimaryOmrComponent(templateInfo.template);

        if (!primaryOmr) return null;

        return {
          id: assignment.teacher_subject_id,
          subject_id: assignment.subject_id,
          subject_name: subject?.subject_name ?? "",
          class_id: assignment.class_id,
          class_name: classItem?.class_name ?? "",
          grade: classItem?.grade ?? null,
          omr_component_key: primaryOmr.key,
          omr_component_label: primaryOmr.label,
          omr_question_count: primaryOmr.question_count ?? primaryOmr.max_mark ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET teacher/omr/assignments FAILED:", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
