import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type ApprovalStatus = "pending" | "approved" | "rejected";

type SubmissionMark = {
    result_id: string;
    student: string;
    student_id: string;
    components: Array<{
        key: string;
        label: string;
        type: string;
        mark: number;
        max_mark: number;
        included_in_total: boolean;
    }>;
    total: number;
    grade: string;
};

type SubmissionOut = {
    id: string;
    subject: string;
    subject_id: string;
    class_id: string | null;
    className: string;
    classGrade: number;
    teacher_id: string | null;
    teacher: string;
    exam_id: string;
    examName: string;
    academic_year: string;
    status: ApprovalStatus;
    submittedAt: string | null;
    marks: SubmissionMark[];
};

function toId(val: unknown) {
    return typeof val === "string" ? val.trim() : val == null ? "" : String(val).trim();
}

function toNumber(val: unknown) {
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) ? n : 0;
}

function gradeFromPercentage(total: number) {
    if (total >= 80) return "A";
    if (total >= 65) return "B";
    if (total >= 50) return "C";
    if (total >= 40) return "D";
    return "E";
}

function normalizeStatus(raw: string | null): ApprovalStatus | "all" {
    if (raw === "pending" || raw === "approved" || raw === "rejected")
        return raw;
    if (raw === "all") return "all";
    return "pending";
}

function statusRank(status: string | null | undefined) {
    if (status === "approved") return 3;
    if (status === "pending") return 2;
    if (status === "rejected") return 1;
    return 0;
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("subject coordinator");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const teacher_id = String(searchParams.get("teacher_id") ?? "").trim();
        const status = normalizeStatus(searchParams.get("status"));

        if (!teacher_id) {
            return NextResponse.json(
                { message: "teacher_id diperlukan", data: [] },
                { status: 400 }
            );
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak", data: [] }, { status: 403 });
        }

        const { data: coordRows, error: coordErr } = await supabase
            .from("stg_subject_coordinators")
            .select("subject_id")
            .eq("teacher_id", teacher_id);

        if (coordErr) {
            return NextResponse.json(
                { message: coordErr.message, data: [] },
                { status: 500 }
            );
        }

        const subjectIds = (coordRows ?? [])
            .map((r) => r.subject_id as string)
            .filter(Boolean);

        if (subjectIds.length === 0) {
            return NextResponse.json({ data: [] });
        }

        let resultsQuery = supabase
            .from("stg_results")
            .select(
                "result_id, student_id, subject_id, exam_id, omr_scan_id, subjective_id, total, grade, status"
            )
            .in("subject_id", subjectIds)
            // Only results with submitted subjective marks should be reviewed
            .not("subjective_id", "is", null);

        if (status !== "all") {
            resultsQuery = resultsQuery.eq("status", status);
        }

        const { data: results, error: resultsErr } = await resultsQuery;

        if (resultsErr) {
            return NextResponse.json(
                { message: resultsErr.message, data: [] },
                { status: 500 }
            );
        }

        const canonicalResultsMap = new Map<string, Record<string, unknown>>();
        for (const row of Array.isArray(results) ? results : []) {
            if (!row || typeof row !== "object") continue;

            const studentId = toId((row as { student_id?: unknown }).student_id);
            const subjectId = toId((row as { subject_id?: unknown }).subject_id);
            const examId = toId((row as { exam_id?: unknown }).exam_id);
            const resultId = toId((row as { result_id?: unknown }).result_id);
            const statusValue = toId((row as { status?: unknown }).status);

            if (!studentId || !subjectId || !examId || !resultId) continue;

            const key = [studentId, subjectId, examId].join("|");
            const existing = canonicalResultsMap.get(key);

            if (!existing) {
                canonicalResultsMap.set(key, row as Record<string, unknown>);
                continue;
            }

            const existingStatus = toId(existing.status);
            const currentRank = statusRank(statusValue);
            const existingRank = statusRank(existingStatus);

            if (currentRank > existingRank) {
                canonicalResultsMap.set(key, row as Record<string, unknown>);
                continue;
            }

            if (currentRank === existingRank) {
                const currentResultId = resultId;
                const existingResultId = toId(existing.result_id);
                if (currentResultId > existingResultId) {
                    canonicalResultsMap.set(key, row as Record<string, unknown>);
                }
            }
        }

        const canonicalResults = Array.from(canonicalResultsMap.values());

        const resultSubjectiveIds = new Set(
            canonicalResults.map((r) => toId(r.subjective_id)).filter(Boolean)
        );

        const { data: standaloneSubjectiveMarks } =
            status === "all" || status === "pending"
                ? await supabase
                      .from("stg_subjective_marks")
                      .select("subjective_id, subjective_mark, teacher_id, student_id, subject_id, exam_id, input_date")
                      .in("subject_id", subjectIds)
                : { data: [] as unknown[] };

        const orphanSubjectiveMarks = (Array.isArray(standaloneSubjectiveMarks)
            ? standaloneSubjectiveMarks
            : []
        ).filter((row: unknown) => {
            if (!row || typeof row !== "object") return false;
            const subjectiveId = toId((row as { subjective_id?: unknown }).subjective_id);
            return subjectiveId && !resultSubjectiveIds.has(subjectiveId);
        });

        const studentIds = Array.from(
            new Set([
                ...canonicalResults.map((r) => toId(r.student_id)),
                ...orphanSubjectiveMarks.map((r: unknown) =>
                    toId((r as { student_id?: unknown }).student_id)
                ),
            ])
        ).filter(Boolean);
        const examIds = Array.from(
            new Set([
                ...canonicalResults.map((r) => toId(r.exam_id)),
                ...orphanSubjectiveMarks.map((r: unknown) =>
                    toId((r as { exam_id?: unknown }).exam_id)
                ),
            ])
        ).filter(Boolean);
        const omrIds = Array.from(
            new Set(canonicalResults.map((r) => toId(r.omr_scan_id)))
        ).filter(Boolean);
        const subjectiveIds = Array.from(
            new Set([
                ...Array.from(resultSubjectiveIds),
                ...orphanSubjectiveMarks.map((r: unknown) =>
                    toId((r as { subjective_id?: unknown }).subjective_id)
                ),
            ])
        ).filter(Boolean);

        const [{ data: students }, { data: classes }, { data: subjects }, { data: exams }, { data: omrScans }, { data: linkedSubjectiveMarks }, { data: componentRows }] =
            await Promise.all([
                supabase
                    .from("stg_students")
                    .select("student_id, fullname, class_id")
                    .in("student_id", studentIds),
                supabase
                    .from("stg_classes")
                    .select("class_id, class_name, grade")
                    .limit(5000),
                supabase
                    .from("stg_subjects")
                    .select("subject_id, subject_name")
                    .in("subject_id", subjectIds),
                supabase
                    .from("stg_exams")
                    .select("exam_id, exam_name, academic_year")
                    .in("exam_id", examIds),
                supabase
                    .from("stg_omr_scans")
                    .select("omr_scan_id, objective_total_mark")
                    .in("omr_scan_id", omrIds),
                supabase
                    .from("stg_subjective_marks")
                    .select("subjective_id, subjective_mark, teacher_id, student_id, subject_id, exam_id, input_date")
                    .in("subjective_id", subjectiveIds),
                supabase
                    .from("stg_mark_components")
                    .select(
                        "student_id, subject_id, exam_id, component_key, component_label, component_type, mark, max_mark, included_in_total"
                    )
                    .in("student_id", studentIds)
                    .in("subject_id", subjectIds)
                    .in("exam_id", examIds),
            ]);

        const studentInfoById = new Map<string, { name: string; classId: string | null }>();
        for (const s of Array.isArray(students) ? students : []) {
            if (!s || typeof s !== "object") continue;
            const id = toId((s as { student_id?: unknown }).student_id);
            if (!id) continue;
            const name = toId((s as { fullname?: unknown }).fullname);
            const classIdRaw = toId((s as { class_id?: unknown }).class_id);
            studentInfoById.set(id, { name, classId: classIdRaw || null });
        }

        const classInfoById = new Map<string, { name: string; grade: number }>();
        for (const c of Array.isArray(classes) ? classes : []) {
            if (!c || typeof c !== "object") continue;
            const id = toId((c as { class_id?: unknown }).class_id);
            const name = toId((c as { class_name?: unknown }).class_name);
            const grade = toNumber((c as { grade?: unknown }).grade);
            if (id) classInfoById.set(id, { name, grade });
        }

        const subjectNameById = new Map<string, string>();
        for (const s of Array.isArray(subjects) ? subjects : []) {
            if (!s || typeof s !== "object") continue;
            const id = toId((s as { subject_id?: unknown }).subject_id);
            const name = toId((s as { subject_name?: unknown }).subject_name);
            if (id) subjectNameById.set(id, name);
        }

        const examInfoById = new Map<string, { name: string; year: string }>();
        for (const e of Array.isArray(exams) ? exams : []) {
            if (!e || typeof e !== "object") continue;
            const id = toId((e as { exam_id?: unknown }).exam_id);
            if (!id) continue;
            examInfoById.set(id, {
                name: toId((e as { exam_name?: unknown }).exam_name),
                year: toId((e as { academic_year?: unknown }).academic_year),
            });
        }

        const objectiveTotalByOmrId = new Map<string, number>();
        for (const o of Array.isArray(omrScans) ? omrScans : []) {
            if (!o || typeof o !== "object") continue;
            const id = toId((o as { omr_scan_id?: unknown }).omr_scan_id);
            if (!id) continue;
            objectiveTotalByOmrId.set(
                id,
                toNumber((o as { objective_total_mark?: unknown }).objective_total_mark)
            );
        }

        const subjectiveInfoById = new Map<
            string,
            {
                mark: number;
                teacherId: string | null;
                studentId: string;
                subjectId: string;
                examId: string;
                inputDate: string | null;
            }
        >();
        const teacherIds = new Set<string>();
        for (const m of Array.isArray(linkedSubjectiveMarks) ? linkedSubjectiveMarks : []) {
            if (!m || typeof m !== "object") continue;
            const id = toId((m as { subjective_id?: unknown }).subjective_id);
            if (!id) continue;
            const teacherId = toId((m as { teacher_id?: unknown }).teacher_id);
            const inputDate = toId((m as { input_date?: unknown }).input_date);
            subjectiveInfoById.set(id, {
                mark: toNumber((m as { subjective_mark?: unknown }).subjective_mark),
                teacherId: teacherId || null,
                studentId: toId((m as { student_id?: unknown }).student_id),
                subjectId: toId((m as { subject_id?: unknown }).subject_id),
                examId: toId((m as { exam_id?: unknown }).exam_id),
                inputDate: inputDate || null,
            });
            if (teacherId) teacherIds.add(teacherId);
        }

        const componentMapByCompositeKey = new Map<
            string,
            Array<{
                key: string;
                label: string;
                type: string;
                mark: number;
                max_mark: number;
                included_in_total: boolean;
            }>
        >();
        for (const row of Array.isArray(componentRows) ? componentRows : []) {
            if (!row || typeof row !== "object") continue;
            const studentId = toId((row as { student_id?: unknown }).student_id);
            const subjectId = toId((row as { subject_id?: unknown }).subject_id);
            const examId = toId((row as { exam_id?: unknown }).exam_id);
            const componentKey = toId((row as { component_key?: unknown }).component_key);
            if (!studentId || !subjectId || !examId || !componentKey) continue;
            const key = [studentId, subjectId, examId].join("|");
            if (!componentMapByCompositeKey.has(key)) componentMapByCompositeKey.set(key, []);
            componentMapByCompositeKey.get(key)!.push({
                key: componentKey,
                label: toId((row as { component_label?: unknown }).component_label) || componentKey,
                type: toId((row as { component_type?: unknown }).component_type),
                mark: toNumber((row as { mark?: unknown }).mark),
                max_mark: toNumber((row as { max_mark?: unknown }).max_mark),
                included_in_total: Boolean((row as { included_in_total?: unknown }).included_in_total),
            });
        }

        const { data: teachers } = teacherIds.size
            ? await supabase
                  .from("stg_teachers")
                  .select("teacher_id, fullname")
                  .in("teacher_id", Array.from(teacherIds))
            : { data: [] as unknown[] };

        const teacherNameById = new Map<string, string>();
        for (const t of Array.isArray(teachers) ? teachers : []) {
            if (!t || typeof t !== "object") continue;
            const id = toId((t as { teacher_id?: unknown }).teacher_id);
            const name = toId((t as { fullname?: unknown }).fullname);
            if (id) teacherNameById.set(id, name);
        }

        // group results into submissions per (subject, class, exam, teacher)
        const submissionsByKey = new Map<string, SubmissionOut>();

        const mergeStatus = (a: ApprovalStatus, b: ApprovalStatus): ApprovalStatus => {
            if (a === "pending" || b === "pending") return "pending";
            if (a === "rejected" || b === "rejected") return "rejected";
            return "approved";
        };

        for (const row of canonicalResults) {
            if (!row || typeof row !== "object") continue;

            const result_id = toId((row as { result_id?: unknown }).result_id);
            const student_id = toId((row as { student_id?: unknown }).student_id);
            const subject_id = toId((row as { subject_id?: unknown }).subject_id);
            const exam_id = toId((row as { exam_id?: unknown }).exam_id);
            const omr_scan_id = toId((row as { omr_scan_id?: unknown }).omr_scan_id);
            const subjective_id = toId((row as { subjective_id?: unknown }).subjective_id);
            const statusRaw = toId((row as { status?: unknown }).status);

            const status: ApprovalStatus =
                statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "pending"
                    ? statusRaw
                    : "pending";

            if (!result_id || !student_id || !subject_id || !exam_id || !subjective_id) continue;

            const studentInfo = studentInfoById.get(student_id);
            const class_id = studentInfo?.classId ?? null;
            const classInfo = class_id ? classInfoById.get(class_id) ?? null : null;
            const className = classInfo?.name ?? "";
            const classGrade = classInfo?.grade ?? 0;

            const subjectName = subjectNameById.get(subject_id) ?? "";
            const examInfo = examInfoById.get(exam_id);

            const subjectiveInfo = subjectiveInfoById.get(subjective_id);
            const teacher_id = subjectiveInfo?.teacherId ?? null;
            const teacherName = teacher_id ? teacherNameById.get(teacher_id) ?? "" : "";
            const submittedAt = subjectiveInfo?.inputDate ?? null;

            const key = [subject_id, class_id ?? "no-class", exam_id, teacher_id ?? "no-teacher"].join("|");

            const total = toNumber((row as { total?: unknown }).total);
            const grade = toId((row as { grade?: unknown }).grade);
            const compositeKey = [student_id, subject_id, exam_id].join("|");
            const components = componentMapByCompositeKey.get(compositeKey) ?? [];
            const fallbackComponents =
                components.length > 0
                    ? components
                    : [
                          {
                              key: "objective",
                              label: "Objektif",
                              type: "omr",
                              mark: omr_scan_id ? objectiveTotalByOmrId.get(omr_scan_id) ?? 0 : 0,
                              max_mark: 0,
                              included_in_total: true,
                          },
                          {
                              key: "subjective",
                              label: "Subjektif",
                              type: "manual",
                              mark: subjectiveInfo?.mark ?? 0,
                              max_mark: 0,
                              included_in_total: true,
                          },
                      ];

            if (!submissionsByKey.has(key)) {
                submissionsByKey.set(key, {
                    id: key,
                    subject: subjectName,
                    class_id,
                    className,
                    classGrade,
                    subject_id,
                    exam_id,
                    examName: examInfo?.name ?? "",
                    academic_year: examInfo?.year ?? "",
                    teacher_id,
                    teacher: teacherName,
                    status,
                    submittedAt,
                    marks: [],
                });
            }

            const group = submissionsByKey.get(key)!;
            group.status = mergeStatus(group.status, status);
            if (submittedAt && (!group.submittedAt || submittedAt > group.submittedAt)) {
                group.submittedAt = submittedAt;
            }

            group.marks.push({
                result_id,
                student: studentInfo?.name ?? student_id,
                student_id,
                components: fallbackComponents,
                total,
                grade,
            });
        }

        for (const row of orphanSubjectiveMarks) {
            if (!row || typeof row !== "object") continue;

            const subjective_id = toId((row as { subjective_id?: unknown }).subjective_id);
            const subjectiveInfo = subjectiveInfoById.get(subjective_id);
            const student_id =
                subjectiveInfo?.studentId || toId((row as { student_id?: unknown }).student_id);
            const subject_id =
                subjectiveInfo?.subjectId || toId((row as { subject_id?: unknown }).subject_id);
            const exam_id =
                subjectiveInfo?.examId || toId((row as { exam_id?: unknown }).exam_id);
            const teacher_id =
                subjectiveInfo?.teacherId || toId((row as { teacher_id?: unknown }).teacher_id) || null;

            if (!subjective_id || !student_id || !subject_id || !exam_id) continue;

            const studentInfo = studentInfoById.get(student_id);
            const class_id = studentInfo?.classId ?? null;
            const classInfo = class_id ? classInfoById.get(class_id) ?? null : null;
            const className = classInfo?.name ?? "";
            const classGrade = classInfo?.grade ?? 0;
            const subjectName = subjectNameById.get(subject_id) ?? "";
            const examInfo = examInfoById.get(exam_id);
            const teacherName = teacher_id ? teacherNameById.get(teacher_id) ?? "" : "";
            const submittedAt =
                subjectiveInfo?.inputDate || toId((row as { input_date?: unknown }).input_date) || null;
            const compositeKey = [student_id, subject_id, exam_id].join("|");
            const components = componentMapByCompositeKey.get(compositeKey) ?? [];
            const fallbackComponents =
                components.length > 0
                    ? components
                    : [
                          {
                              key: "subjective",
                              label: "Subjektif",
                              type: "manual",
                              mark: subjectiveInfo?.mark ?? toNumber((row as { subjective_mark?: unknown }).subjective_mark),
                              max_mark: 0,
                              included_in_total: true,
                          },
                      ];
            const total = fallbackComponents
                .filter((component) => component.included_in_total)
                .reduce((sum, component) => sum + component.mark, 0);
            const key = [subject_id, class_id ?? "no-class", exam_id, teacher_id ?? "no-teacher"].join("|");

            if (!submissionsByKey.has(key)) {
                submissionsByKey.set(key, {
                    id: key,
                    subject: subjectName,
                    class_id,
                    className,
                    classGrade,
                    subject_id,
                    exam_id,
                    examName: examInfo?.name ?? "",
                    academic_year: examInfo?.year ?? "",
                    teacher_id,
                    teacher: teacherName,
                    status: "pending",
                    submittedAt,
                    marks: [],
                });
            }

            const group = submissionsByKey.get(key)!;
            group.status = mergeStatus(group.status, "pending");
            if (submittedAt && (!group.submittedAt || submittedAt > group.submittedAt)) {
                group.submittedAt = submittedAt;
            }
            group.marks.push({
                result_id: `subjective:${subjective_id}`,
                student: studentInfo?.name ?? student_id,
                student_id,
                components: fallbackComponents,
                total,
                grade: "-",
            });
        }

        const submissions = Array.from(submissionsByKey.values()).sort((a, b) => {
            const aa = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const bb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return bb - aa;
        });

        return NextResponse.json({ data: submissions });
    } catch (err) {
        console.error("COORDINATOR APPROVALS ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("subject coordinator");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const action = String(body?.action ?? "").trim();
        const subject_id = String(body?.subject_id ?? "").trim();
        const class_id = String(body?.class_id ?? "").trim();
        const exam_id = String(body?.exam_id ?? "").trim();
        const teacher_id = String(body?.teacher_id ?? "").trim();

        if (!action || !subject_id || !class_id || !exam_id) {
            return NextResponse.json(
                { message: "action, subject_id, class_id, exam_id diperlukan" },
                { status: 400 }
            );
        }

        const nextStatus: ApprovalStatus =
            action === "approve"
                ? "approved"
                : action === "reject"
                  ? "rejected"
                  : "pending";

        if (nextStatus === "pending") {
            return NextResponse.json(
                { message: "Tindakan tidak sah" },
                { status: 400 }
            );
        }

        const { data: coordinatorRows, error: coordinatorErr } = await supabase
            .from("stg_subject_coordinators")
            .select("subject_coordinator_id")
            .eq("teacher_id", guard.session.user_id)
            .eq("subject_id", subject_id)
            .limit(1);

        if (coordinatorErr) {
            return NextResponse.json(
                { message: coordinatorErr.message },
                { status: 500 }
            );
        }

        if (!Array.isArray(coordinatorRows) || coordinatorRows.length === 0) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: students, error: studentErr } = await supabaseAdmin
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);

        if (studentErr) {
            return NextResponse.json(
                { message: studentErr.message },
                { status: 500 }
            );
        }

        const studentIds = (Array.isArray(students) ? students : [])
            .map((s: unknown) => {
                if (!s || typeof s !== "object") return "";
                return toId((s as { student_id?: unknown }).student_id);
            })
            .filter((x) => Boolean(x));

        if (studentIds.length === 0) {
            return NextResponse.json({ success: true, updated: 0 });
        }

        const { data: pendingRows, error: pendingErr } = await supabaseAdmin
            .from("stg_results")
            .select("result_id, subjective_id")
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .eq("status", "pending")
            .not("subjective_id", "is", null)
            .in("student_id", studentIds);

        if (pendingErr) {
            return NextResponse.json(
                { message: pendingErr.message },
                { status: 500 }
            );
        }

        const pendingResultRows = Array.isArray(pendingRows) ? pendingRows : [];
        const pendingSubjectiveIds = pendingResultRows
            .map((row: unknown) => {
                if (!row || typeof row !== "object") return "";
                return toId((row as { subjective_id?: unknown }).subjective_id);
            })
            .filter(Boolean);

        const { data: matchingSubjectives } =
            pendingSubjectiveIds.length > 0
                ? await supabaseAdmin
                      .from("stg_subjective_marks")
                      .select("subjective_id")
                      .in("subjective_id", pendingSubjectiveIds)
                      .eq("teacher_id", teacher_id || "__no_teacher__")
                : { data: [] as unknown[] };

        const matchingSubjectiveIdSet = new Set(
            (Array.isArray(matchingSubjectives) ? matchingSubjectives : [])
                .map((row: unknown) => {
                    if (!row || typeof row !== "object") return "";
                    return toId((row as { subjective_id?: unknown }).subjective_id);
                })
                .filter(Boolean)
        );

        const resultIds = pendingResultRows
            .filter((row: unknown) => {
                if (!teacher_id) return true;
                if (!row || typeof row !== "object") return false;
                return matchingSubjectiveIdSet.has(
                    toId((row as { subjective_id?: unknown }).subjective_id)
                );
            })
            .map((row: unknown) => {
                if (!row || typeof row !== "object") return "";
                return toId((row as { result_id?: unknown }).result_id);
            })
            .filter(Boolean);

        let rejectedSyntheticCount = 0;
        if (nextStatus === "rejected" && teacher_id) {
            const [{ data: teacherSubjectives, error: subjectiveErr }, { data: existingResults, error: existingResultsErr }] =
                await Promise.all([
                    supabaseAdmin
                        .from("stg_subjective_marks")
                        .select("subjective_id, student_id, subjective_mark")
                        .eq("teacher_id", teacher_id)
                        .eq("subject_id", subject_id)
                        .eq("exam_id", exam_id)
                        .in("student_id", studentIds),
                    supabaseAdmin
                        .from("stg_results")
                        .select("result_id, student_id, subjective_id")
                        .eq("subject_id", subject_id)
                        .eq("exam_id", exam_id)
                        .in("student_id", studentIds),
                ]);

            if (subjectiveErr) {
                return NextResponse.json(
                    { message: subjectiveErr.message },
                    { status: 500 }
                );
            }

            if (existingResultsErr) {
                return NextResponse.json(
                    { message: existingResultsErr.message },
                    { status: 500 }
                );
            }

            const referencedSubjectiveIds = new Set(
                (Array.isArray(existingResults) ? existingResults : [])
                    .map((row: unknown) => {
                        if (!row || typeof row !== "object") return "";
                        return toId((row as { subjective_id?: unknown }).subjective_id);
                    })
                    .filter(Boolean)
            );

            const existingResultByStudentId = new Map<string, string>();
            for (const row of Array.isArray(existingResults) ? existingResults : []) {
                if (!row || typeof row !== "object") continue;
                const studentId = toId((row as { student_id?: unknown }).student_id);
                const resultId = toId((row as { result_id?: unknown }).result_id);
                if (studentId && resultId && !existingResultByStudentId.has(studentId)) {
                    existingResultByStudentId.set(studentId, resultId);
                }
            }

            for (const row of Array.isArray(teacherSubjectives) ? teacherSubjectives : []) {
                if (!row || typeof row !== "object") continue;
                const subjectiveId = toId((row as { subjective_id?: unknown }).subjective_id);
                const studentId = toId((row as { student_id?: unknown }).student_id);
                if (!subjectiveId || !studentId || referencedSubjectiveIds.has(subjectiveId)) continue;

                const total = toNumber((row as { subjective_mark?: unknown }).subjective_mark);
                const grade = gradeFromPercentage(total);
                const existingResultId = existingResultByStudentId.get(studentId);

                if (existingResultId) {
                    const { error: linkErr } = await supabaseAdmin
                        .from("stg_results")
                        .update({
                            subjective_id: subjectiveId,
                            total,
                            grade,
                            status: "rejected",
                            approval_date: new Date().toISOString(),
                        })
                        .eq("result_id", existingResultId);

                    if (linkErr) {
                        return NextResponse.json(
                            { message: linkErr.message },
                            { status: 500 }
                        );
                    }
                } else {
                    const { error: insertErr } = await supabaseAdmin
                        .from("stg_results")
                        .insert({
                            student_id: studentId,
                            subject_id,
                            exam_id,
                            subjective_id: subjectiveId,
                            total,
                            grade,
                            status: "rejected",
                            approval_date: new Date().toISOString(),
                        });

                    if (insertErr) {
                        return NextResponse.json(
                            { message: insertErr.message },
                            { status: 500 }
                        );
                    }
                }

                rejectedSyntheticCount += 1;
            }
        }

        if (resultIds.length === 0) {
            if (rejectedSyntheticCount > 0) {
                return NextResponse.json({
                    success: true,
                    updated: rejectedSyntheticCount,
                });
            }

            return NextResponse.json({
                success: true,
                updated: 0,
                message: "Tiada markah pending untuk dikemas kini",
            });
        }

        const { data: updatedRows, error: updateErr } = await supabaseAdmin
            .from("stg_results")
            .update({
                status: nextStatus,
                approval_date: new Date().toISOString(),
            })
            .in("result_id", resultIds)
            .select("result_id");

        if (updateErr) {
            return NextResponse.json(
                { message: updateErr.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            updated: (Array.isArray(updatedRows) ? updatedRows.length : 0) + rejectedSyntheticCount,
        });
    } catch (err) {
        console.error("COORDINATOR APPROVAL ACTION ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
