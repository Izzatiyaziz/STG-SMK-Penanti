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
import { gradeFromTotal as gradeFromPercentage } from "@/lib/grade-utils";
import { isMarkingClosedForAssignment } from "@/lib/exam-utils";

export const runtime = "nodejs";

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
): Record<string, number | null> {
  const fromComponents =
    row.components && typeof row.components === "object"
      ? Object.fromEntries(
          Object.entries(row.components).map(([key, value]) => [
            key,
            value === null || value === undefined || String(value).trim() === ""
              ? null
              : toNumber(value, 0),
          ]),
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
    if (isMarkingClosedForAssignment(
      { subject_settings: exam?.subject_settings as Record<string, unknown> | undefined },
      { subject_id, grade: Number(classRow?.grade ?? 0) },
    )) {
      return NextResponse.json(
        { message: "Pemarkahan telah ditutup oleh panitia untuk peperiksaan ini." },
        { status: 409 },
      );
    }

    const templateInfo = getGradeTemplateForClass({
      subjectSettings: (exam?.subject_settings as Record<string, unknown> | null | undefined) ?? {},
      subjectId: subject_id,
      subjectName: typeof subjectRow?.subject_name === "string" ? subjectRow.subject_name : "",
      grade: typeof classRow?.grade === "number" ? classRow.grade : Number(classRow?.grade ?? 0),
    });

    const deadline = templateInfo.deadline ? String(templateInfo.deadline).trim() : "";
    const today = getMalaysiaDateInputValue();
    const lateDays =
      !saveAsDraft && deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && today > deadline
        ? Math.max(
            0,
            Math.round(
              (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${deadline}T00:00:00Z`)) /
                86_400_000,
            ),
          )
        : 0;

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

    const payloadByStudent = new Map<string, Record<string, number | null>>();
    for (const row of marks) {
      const sid = toId(row?.student_id);
      if (!sid) continue;
      payloadByStudent.set(
        sid,
        buildComponentPayload(row, templateInfo.template.components, primaryOmrComponent?.key ?? null),
      );
    }

    if (!saveAsDraft && payloadByStudent.size > 0) {
      const payloadStudentIds = Array.from(payloadByStudent.keys()).filter((studentId) =>
        studentIdSet.has(studentId),
      );
      const [
        { data: existingComponentRows, error: existingComponentsErr },
        { data: existingSubjectiveRows, error: existingSubjectivesErr },
      ] = payloadStudentIds.length > 0
        ? await Promise.all([
            supabase
              .from("stg_mark_components")
              .select("student_id, component_key, mark")
              .eq("subject_id", subject_id)
              .eq("exam_id", exam_id)
              .eq("class_id", class_id)
              .eq("teacher_id", teacher_id)
              .in("student_id", payloadStudentIds),
            supabase
              .from("stg_subjective_marks")
              .select("student_id, subjective_mark")
              .eq("subject_id", subject_id)
              .eq("exam_id", exam_id)
              .eq("teacher_id", teacher_id)
              .in("student_id", payloadStudentIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
          ];

      if (existingComponentsErr) {
        return NextResponse.json({ message: existingComponentsErr.message }, { status: 500 });
      }
      if (existingSubjectivesErr) {
        return NextResponse.json({ message: existingSubjectivesErr.message }, { status: 500 });
      }

      const existingMarksByStudent = new Map<string, Record<string, number>>();
      for (const row of existingComponentRows ?? []) {
        const studentId = toId(row.student_id);
        const componentKey = toId(row.component_key);
        if (!studentId || !componentKey) continue;
        const current = existingMarksByStudent.get(studentId) ?? {};
        current[componentKey] = toNumber(row.mark, 0);
        existingMarksByStudent.set(studentId, current);
      }

      const manualComponents = templateInfo.template.components.filter(
        (component) => component.type === "manual",
      );
      const fallbackManualComponent =
        manualComponents.find((component) => component.key === "subjective") ??
        (manualComponents.length === 1 ? manualComponents[0] : null);
      if (fallbackManualComponent) {
        for (const row of existingSubjectiveRows ?? []) {
          const studentId = toId(row.student_id);
          if (!studentId) continue;
          const current = existingMarksByStudent.get(studentId) ?? {};
          if (current[fallbackManualComponent.key] === undefined) {
            current[fallbackManualComponent.key] = toNumber(row.subjective_mark, 0);
          }
          existingMarksByStudent.set(studentId, current);
        }
      }

      for (const [studentId, marksByKey] of payloadByStudent) {
        const existingMarks = existingMarksByStudent.get(studentId) ?? {};
        for (const component of templateInfo.template.components) {
          if (marksByKey[component.key] !== null && marksByKey[component.key] !== undefined) {
            continue;
          }
          if (existingMarks[component.key] !== undefined) {
            marksByKey[component.key] = existingMarks[component.key];
          }
        }
      }
    }

    const submittedStudentIds = saveAsDraft
      ? studentIds
      : Array.from(payloadByStudent.entries())
          .filter(([, marksByKey]) =>
            templateInfo.template.components.every(
              (component) => marksByKey[component.key] !== null && marksByKey[component.key] !== undefined,
            ),
          )
          .map(([studentId]) => studentId)
          .filter((studentId) => studentIdSet.has(studentId));

    if (!saveAsDraft) {
      const incompleteStudentCount = Array.from(payloadByStudent.keys()).filter(
        (studentId) =>
          studentIdSet.has(studentId) && !submittedStudentIds.includes(studentId),
      ).length;
      if (incompleteStudentCount > 0) {
        return NextResponse.json(
          {
            message:
              `${incompleteStudentCount} pelajar masih mempunyai markah yang tidak lengkap. ` +
              "Lengkapkan komponen yang belum pernah diisi sebelum menghantar semula.",
          },
          { status: 400 },
        );
      }
    }

    if (!saveAsDraft && submittedStudentIds.length === 0) {
      return NextResponse.json(
        { message: "Tiada markah pelajar yang lengkap untuk dihantar" },
        { status: 400 },
      );
    }

    for (const studentId of submittedStudentIds) {
      const marksByKey = payloadByStudent.get(studentId) ?? {};
      for (const component of templateInfo.template.components) {
        const rawMark = marksByKey[component.key];
        if (rawMark === null || rawMark === undefined) continue;
        const mark = toNumber(rawMark, 0);
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
        const blankComponentKeys = templateInfo.template.components
          .filter((component) => marksByKey[component.key] === null || marksByKey[component.key] === undefined)
          .map((component) => component.key);
        const componentRows = templateInfo.template.components
          .filter((component) => marksByKey[component.key] !== null && marksByKey[component.key] !== undefined)
          .map((component) => ({
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
            included_in_total: component.included_in_total !== false,
            question_count: component.question_count ?? null,
            group_name: templateInfo.group,
            input_date: new Date().toISOString(),
          }));

        if (blankComponentKeys.length > 0) {
          const { error: deleteErr } = await supabase
            .from("stg_mark_components")
            .delete()
            .eq("student_id", studentId)
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .in("component_key", blankComponentKeys);
          if (deleteErr) throw deleteErr;
        }

        const { error: componentsErr } = componentRows.length > 0
          ? await supabase.from("stg_mark_components").upsert(componentRows, {
              onConflict: "student_id,subject_id,exam_id,component_key",
            })
          : { error: null };
        if (componentsErr) {
          throw new Error(
            `${componentsErr.message}. Jalankan migration stg_mark_components dahulu sebelum guna template pemarkahan baharu.`,
          );
        }
      }

      return NextResponse.json({ success: true, draft: true });
    }

    // Pre-fetch all existing records in batch to avoid N+1 queries
    const [{ data: existingSubjectives }, { data: existingOmrScans }] =
      await Promise.all([
        supabase
          .from("stg_subjective_marks")
          .select("subjective_id, student_id")
          .eq("teacher_id", teacher_id)
          .eq("subject_id", subject_id)
          .eq("exam_id", exam_id)
          .in("student_id", studentIds),
        primaryOmrComponent
          ? supabase
              .from("stg_omr_scans")
              .select("omr_scan_id, student_id, objective_total_mark")
              .eq("subject_id", subject_id)
              .eq("exam_id", exam_id)
              .in("student_id", studentIds)
              .order("scan_date", { ascending: false })
          : { data: [] as Array<{ omr_scan_id: string; student_id: string }> | null },
      ]);

    const subjectiveByStudent = new Map<string, string>(
      (existingSubjectives ?? []).map((r) => [toId(r.student_id), toId(r.subjective_id)])
    );
    // Keep only the latest scan per student
    const omrScanByStudent = new Map<string, string>();
    for (const scan of existingOmrScans ?? []) {
      const sid = toId(scan.student_id);
      if (!omrScanByStudent.has(sid)) omrScanByStudent.set(sid, toId(scan.omr_scan_id));
    }
    const now = new Date().toISOString();

    // Compute all per-student values in memory
    type StudentComputed = {
      studentId: string;
      marksByKey: Record<string, number>;
      manualTotal: number;
      primaryOmrMark: number;
      total: number;
      grade: string;
    };
    const computed: StudentComputed[] = submittedStudentIds.map((studentId) => {
      const marksByKey = Object.fromEntries(
        templateInfo.template.components.map((component) => [
          component.key,
          toNumber(payloadByStudent.get(studentId)?.[component.key], 0),
        ]),
      );
      const summary = computeMarkSummary(templateInfo.template, marksByKey);
      const manualTotal = summary.components
        .filter((c) => c.type === "manual")
        .reduce((sum, c) => sum + c.mark, 0);
      return {
        studentId,
        marksByKey,
        manualTotal,
        primaryOmrMark: primaryOmrComponent ? toNumber(marksByKey[primaryOmrComponent.key], 0) : 0,
        total: summary.percentage,
        grade: gradeFromPercentage(summary.percentage, Number(classRow?.grade ?? 0)),
      };
    });

    // Batch upsert mark_components for all students
    const allComponentRows = computed.flatMap(({ studentId, marksByKey }) =>
      templateInfo.template.components.map((component) => ({
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
        input_date: now,
      }))
    );
    const { error: componentsErr } = await supabase
      .from("stg_mark_components")
      .upsert(allComponentRows, { onConflict: "student_id,subject_id,exam_id,component_key" });
    if (componentsErr) {
      throw new Error(
        `${componentsErr.message}. Jalankan migration stg_mark_components dahulu sebelum guna template pemarkahan baharu.`
      );
    }

    // Save subjective marks without relying on a composite unique constraint.
    const subjectiveRowsToSave = computed.map(({ studentId, manualTotal }) => ({
      teacher_id,
      student_id: studentId,
      subject_id,
      exam_id,
      subjective_mark: manualTotal,
      input_date: now,
    }));

    const existingSubjectiveByStudent = new Map(
      (existingSubjectives ?? []).map((row) => [toId(row.student_id), toId(row.subjective_id)]),
    );
    const subjectiveRowsToInsert = subjectiveRowsToSave.filter(
      (row) => !existingSubjectiveByStudent.has(row.student_id),
    );
    const subjectiveRowsToUpdate = subjectiveRowsToSave.filter(
      (row) => existingSubjectiveByStudent.has(row.student_id),
    );

    const newSubjectiveByStudent = new Map<string, string>(existingSubjectiveByStudent);

    if (subjectiveRowsToInsert.length > 0) {
      const { data: insertedSubjectives, error: insertSubjectiveErr } = await supabase
        .from("stg_subjective_marks")
        .insert(subjectiveRowsToInsert)
        .select("subjective_id, student_id");
      if (insertSubjectiveErr) throw insertSubjectiveErr;
      for (const row of insertedSubjectives ?? []) {
        newSubjectiveByStudent.set(toId(row.student_id), toId(row.subjective_id));
      }
    }

    const subjectiveUpdateResults = await Promise.all(
      subjectiveRowsToUpdate.map((row) =>
        supabase
          .from("stg_subjective_marks")
          .update({
            subjective_mark: row.subjective_mark,
            input_date: row.input_date,
          })
          .eq("subjective_id", existingSubjectiveByStudent.get(row.student_id) ?? ""),
      ),
    );
    const subjectiveUpdateError = subjectiveUpdateResults.find((result) => result.error)?.error;
    if (subjectiveUpdateError) throw subjectiveUpdateError;

    // Handle OMR scans: insert new ones for students without a scan
    if (primaryOmrComponent) {
      const studentsNeedingNewScan = computed.filter(({ studentId }) => !omrScanByStudent.has(studentId));
      if (studentsNeedingNewScan.length > 0) {
        const { data: newScans, error: newScanErr } = await supabase
          .from("stg_omr_scans")
          .insert(
            studentsNeedingNewScan.map(({ studentId, primaryOmrMark }) => ({
              student_id: studentId,
              subject_id,
              exam_id,
              objective_total_mark: primaryOmrMark,
              scan_date: now,
            }))
          )
          .select("omr_scan_id, student_id");
        if (newScanErr) throw newScanErr;
        for (const scan of newScans ?? []) {
          omrScanByStudent.set(toId(scan.student_id), toId(scan.omr_scan_id));
        }
      }
      // Update existing scans in batch (individual updates are needed since values differ per student)
      const studentsWithExistingScan = computed.filter(({ studentId }) =>
        existingOmrScans?.some((s) => toId(s.student_id) === studentId)
      );
      await Promise.all(
        studentsWithExistingScan.map(({ studentId, primaryOmrMark }) => {
          const scanId = omrScanByStudent.get(studentId);
          if (!scanId) return Promise.resolve();
          return supabase
            .from("stg_omr_scans")
            .update({ objective_total_mark: primaryOmrMark, scan_date: now })
            .eq("omr_scan_id", scanId);
        })
      );
    }

    // Save results without relying on a composite unique constraint in older databases.
    const resultRowsToSave = computed.map(({ studentId, total, grade }) => ({
      student_id: studentId,
      subject_id,
      exam_id,
      omr_scan_id: omrScanByStudent.get(studentId) ?? null,
      subjective_id: newSubjectiveByStudent.get(studentId) ?? subjectiveByStudent.get(studentId) ?? null,
      total,
      grade,
      status: "pending",
    }));

    const { data: existingResultRows, error: existingResultsErr } = await supabase
      .from("stg_results")
      .select("result_id, student_id")
      .eq("subject_id", subject_id)
      .eq("exam_id", exam_id)
      .in("student_id", studentIds);
    if (existingResultsErr) throw existingResultsErr;

    const existingStudentIds = new Set(
      (existingResultRows ?? []).map((row) => toId(row.student_id)).filter(Boolean),
    );
    const rowsToInsert = resultRowsToSave.filter((row) => !existingStudentIds.has(row.student_id));
    const rowsToUpdate = resultRowsToSave.filter((row) => existingStudentIds.has(row.student_id));

    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from("stg_results").insert(rowsToInsert);
      if (error) throw error;
    }

    const updateResults = await Promise.all(
      rowsToUpdate.map((row) =>
        supabase
          .from("stg_results")
          .update({
            omr_scan_id: row.omr_scan_id,
            subjective_id: row.subjective_id,
            total: row.total,
            grade: row.grade,
            status: row.status,
            rejection_reason: null,
          })
          .eq("student_id", row.student_id)
          .eq("subject_id", subject_id)
          .eq("exam_id", exam_id),
      ),
    );
    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) throw updateError;

    // Audit trail: log mark submission event (fire-and-forget)
    void Promise.resolve(supabase.from("stg_sessions").insert({
      user_id: teacher_id,
      role: "teacher",
      action: `Kemaskini Markah: ${subject_id} | Exam: ${exam_id} | Kelas: ${class_id} | ${studentIds.length} pelajar`,
    })).catch(() => {});

    return NextResponse.json({ success: true, late: lateDays > 0, late_days: lateDays });
  } catch (err: unknown) {
    console.error("POST teacher marks FAILED:", err);
    const message =
      err instanceof Error
        ? err.message
        : err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "Ralat pelayan")
          : "Ralat pelayan";
    return NextResponse.json({ message }, { status: 500 });
  }
}
