import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import {
  computeMarkSummary,
  getGradeTemplateForClass,
  getPrimaryOmrComponent,
  type MarkComponent,
} from "@/lib/marking-template";
import { getMalaysiaDateInputValue } from "@/lib/date-utils";

export const runtime = "nodejs";

function gradeFromPercentage(total: number) {
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  return "E";
}

function toId(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

type InputMarkRow = {
  student_id?: unknown;
  subjective_mark?: unknown;
  objective_mark?: unknown;
  components?: Record<string, unknown>;
};

function buildComponentPayload(
  row: InputMarkRow,
  templateComponents: MarkComponent[],
  primaryOmrKey: string | null,
) {
  const fromComponents =
    row.components && typeof row.components === "object"
      ? Object.fromEntries(
          Object.entries(row.components).map(([key, value]) => [key, toNumber(value, 0)]),
        )
      : {};

  if (Object.keys(fromComponents).length > 0) return fromComponents;

  const next: Record<string, number> = {};
  for (const component of templateComponents) {
    if (component.type === "omr") {
      if (component.key === primaryOmrKey) {
        next[component.key] = toNumber(row.objective_mark, 0);
      }
    } else if (component.key === "subjective") {
      next[component.key] = toNumber(row.subjective_mark, 0);
    }
  }
  return next;
}

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const teacher_id = toId(body?.teacher_id);
    const class_id = toId(body?.class_id);
    const subject_id = toId(body?.subject_id);
    const exam_id = toId(body?.exam_id);
    const saveAsDraft = body?.save_as_draft === true;
    const marks = Array.isArray(body?.marks) ? (body.marks as InputMarkRow[]) : [];

    if (!teacher_id || !class_id || !subject_id || !exam_id) {
      return NextResponse.json(
        { message: "teacher_id, class_id, subject_id, exam_id diperlukan" },
        { status: 400 },
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

    const [{ data: exam, error: examErr }, { data: classRow }, { data: subjectRow }] = await Promise.all([
      supabase.from("stg_exams").select("subject_settings").eq("exam_id", exam_id).single(),
      supabase.from("stg_classes").select("grade").eq("class_id", class_id).maybeSingle(),
      supabase.from("stg_subjects").select("subject_name").eq("subject_id", subject_id).maybeSingle(),
    ]);

    if (examErr) {
      return NextResponse.json({ message: examErr.message }, { status: 500 });
    }

    const templateInfo = getGradeTemplateForClass({
      subjectSettings: (exam?.subject_settings as Record<string, unknown> | null | undefined) ?? {},
      subjectId: subject_id,
      subjectName: typeof subjectRow?.subject_name === "string" ? subjectRow.subject_name : "",
      grade: typeof classRow?.grade === "number" ? classRow.grade : Number(classRow?.grade ?? 0),
    });

    const deadline = templateInfo.deadline ? String(templateInfo.deadline).trim() : "";
    if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      const today = getMalaysiaDateInputValue();
      if (!saveAsDraft && today > deadline) {
        return NextResponse.json(
          {
            message: `Tarikh akhir penghantaran telah tamat (${deadline}). Sila hubungi Penyelaras Subjek.`,
          },
          { status: 403 },
        );
      }
    }

    const primaryOmrComponent = getPrimaryOmrComponent(templateInfo.template);

    const { data: students, error: sErr } = await supabase
      .from("stg_students")
      .select("student_id")
      .eq("class_id", class_id);

    if (sErr) {
      return NextResponse.json({ message: sErr.message }, { status: 500 });
    }

    const studentIds = (students ?? [])
      .map((student: { student_id?: unknown }) => toId(student.student_id))
      .filter(Boolean);
    const studentIdSet = new Set(studentIds);

    if (studentIds.length > 0) {
      const { data: resultRows, error: resultStatusErr } = await supabase
        .from("stg_results")
        .select("status, subjective_id")
        .eq("subject_id", subject_id)
        .eq("exam_id", exam_id)
        .not("subjective_id", "is", null)
        .in("student_id", studentIds);

      if (resultStatusErr) {
        return NextResponse.json({ message: resultStatusErr.message }, { status: 500 });
      }

      const subjectiveIds = Array.from(
        new Set(
          (Array.isArray(resultRows) ? resultRows : [])
            .map((row: unknown) => {
              if (!row || typeof row !== "object") return "";
              return toId((row as { subjective_id?: unknown }).subjective_id);
            })
            .filter(Boolean),
        ),
      );

      const { data: linkedSubjectives, error: linkedSubjectivesErr } =
        subjectiveIds.length > 0
          ? await supabase
              .from("stg_subjective_marks")
              .select("subjective_id, teacher_id")
              .in("subjective_id", subjectiveIds)
          : { data: [] as unknown[], error: null };

      if (linkedSubjectivesErr) {
        return NextResponse.json({ message: linkedSubjectivesErr.message }, { status: 500 });
      }

      const mySubjectiveIds = new Set(
        (Array.isArray(linkedSubjectives) ? linkedSubjectives : [])
          .filter((row: unknown) => {
            if (!row || typeof row !== "object") return false;
            return toId((row as { teacher_id?: unknown }).teacher_id) === teacher_id;
          })
          .map((row: unknown) => toId((row as { subjective_id?: unknown }).subjective_id))
          .filter(Boolean),
      );

      let hasApproved = false;
      let hasRejected = false;
      for (const row of Array.isArray(resultRows) ? resultRows : []) {
        if (!row || typeof row !== "object") continue;
        const subjectiveId = toId((row as { subjective_id?: unknown }).subjective_id);
        if (!subjectiveId || !mySubjectiveIds.has(subjectiveId)) continue;
        const status = toId((row as { status?: unknown }).status);
        if (status === "approved") hasApproved = true;
        if (status === "rejected") hasRejected = true;
      }

      if (hasApproved && !hasRejected) {
        return NextResponse.json(
          {
            message:
              "Markah untuk kelas ini telah diluluskan oleh Panitia Subjek dan tidak boleh dikemas kini.",
          },
          { status: 409 },
        );
      }
    }

    const payloadByStudent = new Map<string, Record<string, number>>();
    for (const row of marks) {
      const sid = toId(row?.student_id);
      if (!sid) continue;
      payloadByStudent.set(
        sid,
        buildComponentPayload(row, templateInfo.template.components, primaryOmrComponent?.key ?? null),
      );
    }

    for (const studentId of studentIds) {
      const marksByKey = payloadByStudent.get(studentId) ?? {};
      for (const component of templateInfo.template.components) {
        const mark = toNumber(marksByKey[component.key], 0);
        if (mark < 0 || mark > component.max_mark) {
          return NextResponse.json(
            {
              message: `Markah ${component.label} tidak sah untuk pelajar ${studentId}. Julat dibenarkan 0-${component.max_mark}.`,
            },
            { status: 400 },
          );
        }
      }
    }

    if (saveAsDraft) {
      const draftStudentIds = Array.from(payloadByStudent.keys()).filter((studentId) =>
        studentIdSet.has(studentId),
      );
      for (const studentId of draftStudentIds) {
        const marksByKey = payloadByStudent.get(studentId) ?? {};
        const componentRows = templateInfo.template.components.map((component) => ({
          student_id: studentId,
          subject_id,
          exam_id,
          class_id,
          teacher_id,
          component_key: component.key,
          component_label: component.label,
          component_type: component.type,
          mark: toNumber(marksByKey[component.key], 0),
          max_mark: component.max_mark,
          included_in_total: true,
          question_count: component.question_count ?? null,
          group_name: templateInfo.group,
          input_date: new Date().toISOString(),
        }));

        const { error: componentsErr } = await supabase.from("stg_mark_components").upsert(componentRows, {
          onConflict: "student_id,subject_id,exam_id,component_key",
        });
        if (componentsErr) {
          throw new Error(
            `${componentsErr.message}. Jalankan migration stg_mark_components dahulu sebelum guna template pemarkahan baharu.`,
          );
        }
      }

      return NextResponse.json({ success: true, draft: true });
    }

    for (const studentId of studentIds) {
      const marksByKey = payloadByStudent.get(studentId) ?? {};
      const summary = computeMarkSummary(templateInfo.template, marksByKey);
      const manualTotal = summary.components
        .filter((component) => component.type === "manual")
        .reduce((sum, component) => sum + component.mark, 0);
      const primaryOmrMark = primaryOmrComponent ? toNumber(marksByKey[primaryOmrComponent.key], 0) : 0;

      const { data: existingSubjective } = await supabase
        .from("stg_subjective_marks")
        .select("subjective_id")
        .eq("teacher_id", teacher_id)
        .eq("student_id", studentId)
        .eq("subject_id", subject_id)
        .eq("exam_id", exam_id)
        .maybeSingle();

      let subjective_id: string | null = null;
      if (existingSubjective?.subjective_id) {
        const { error: updateSubjectiveErr } = await supabase
          .from("stg_subjective_marks")
          .update({
            subjective_mark: manualTotal,
            input_date: new Date().toISOString(),
          })
          .eq("subjective_id", existingSubjective.subjective_id);
        if (updateSubjectiveErr) throw updateSubjectiveErr;
        subjective_id = existingSubjective.subjective_id;
      } else {
        const { data: createdSubjective, error: createSubjectiveErr } = await supabase
          .from("stg_subjective_marks")
          .insert({
            teacher_id,
            student_id: studentId,
            subject_id,
            exam_id,
            subjective_mark: manualTotal,
          })
          .select("subjective_id")
          .single();
        if (createSubjectiveErr) throw createSubjectiveErr;
        subjective_id = toId(createdSubjective?.subjective_id) || null;
      }

      let omr_scan_id: string | null = null;
      if (primaryOmrComponent) {
        const { data: latestOmr } = await supabase
          .from("stg_omr_scans")
          .select("omr_scan_id, objective_total_mark")
          .eq("student_id", studentId)
          .eq("subject_id", subject_id)
          .eq("exam_id", exam_id)
          .order("scan_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestOmr?.omr_scan_id) {
          const { error: updateOmrErr } = await supabase
            .from("stg_omr_scans")
            .update({
              objective_total_mark: primaryOmrMark,
              scan_date: new Date().toISOString(),
            })
            .eq("omr_scan_id", latestOmr.omr_scan_id);
          if (updateOmrErr) throw updateOmrErr;
          omr_scan_id = toId(latestOmr.omr_scan_id) || null;
        } else {
          const { data: createdOmr, error: createOmrErr } = await supabase
            .from("stg_omr_scans")
            .insert({
              student_id: studentId,
              subject_id,
              exam_id,
              objective_total_mark: primaryOmrMark,
              scan_date: new Date().toISOString(),
            })
            .select("omr_scan_id")
            .single();
          if (createOmrErr) throw createOmrErr;
          omr_scan_id = toId(createdOmr?.omr_scan_id) || null;
        }
      }

      const componentRows = templateInfo.template.components.map((component) => ({
        student_id: studentId,
        subject_id,
        exam_id,
        class_id,
        teacher_id,
        component_key: component.key,
        component_label: component.label,
        component_type: component.type,
        mark: toNumber(marksByKey[component.key], 0),
        max_mark: component.max_mark,
        included_in_total: true,
        question_count: component.question_count ?? null,
        group_name: templateInfo.group,
        input_date: new Date().toISOString(),
      }));

      const { error: componentsErr } = await supabase.from("stg_mark_components").upsert(componentRows, {
        onConflict: "student_id,subject_id,exam_id,component_key",
      });
      if (componentsErr) {
        throw new Error(
          `${componentsErr.message}. Jalankan migration stg_mark_components dahulu sebelum guna template pemarkahan baharu.`,
        );
      }
      const total = summary.percentage;
      const grade = gradeFromPercentage(total);

      const { data: exactExistingResult } = subjective_id
        ? await supabase
            .from("stg_results")
            .select("result_id")
            .eq("student_id", studentId)
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .eq("subjective_id", subjective_id)
            .limit(1)
            .maybeSingle()
        : { data: null };

      const { data: fallbackExistingResults } = exactExistingResult?.result_id
        ? { data: [] as Array<{ result_id?: unknown }> }
        : await supabase
            .from("stg_results")
            .select("result_id")
            .eq("student_id", studentId)
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .limit(1);

      const existingResultId =
        toId(exactExistingResult?.result_id) ||
        toId(
          Array.isArray(fallbackExistingResults)
            ? fallbackExistingResults[0]?.result_id
            : "",
        );

      if (existingResultId) {
        const { error: updateResultErr } = await supabase
          .from("stg_results")
          .update({
            omr_scan_id,
            subjective_id,
            total,
            grade,
            status: "pending",
          })
          .eq("result_id", existingResultId);
        if (updateResultErr) throw updateResultErr;
      } else {
        const { error: insertResultErr } = await supabase.from("stg_results").insert({
          student_id: studentId,
          subject_id,
          exam_id,
          omr_scan_id,
          subjective_id,
          total,
          grade,
          status: "pending",
        });
        if (insertResultErr) throw insertResultErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("POST teacher marks FAILED:", err);
    const message = err instanceof Error ? err.message : "Ralat pelayan";
    return NextResponse.json({ message }, { status: 500 });
  }
}
