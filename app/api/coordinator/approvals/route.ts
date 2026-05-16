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
    objective: number;
    subjective: number;
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

        const studentIds = Array.from(
            new Set(canonicalResults.map((r) => toId(r.student_id)))
        ).filter(Boolean);
        const examIds = Array.from(
            new Set(canonicalResults.map((r) => toId(r.exam_id)))
        ).filter(Boolean);
        const omrIds = Array.from(
            new Set(canonicalResults.map((r) => toId(r.omr_scan_id)))
        ).filter(Boolean);
        const subjectiveIds = Array.from(
            new Set(canonicalResults.map((r) => toId(r.subjective_id)))
        ).filter(Boolean);

        const [{ data: students }, { data: classes }, { data: subjects }, { data: exams }, { data: omrScans }, { data: subjectiveMarks }] =
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
                    .select("subjective_id, subjective_mark, teacher_id, input_date")
                    .in("subjective_id", subjectiveIds),
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
            { mark: number; teacherId: string | null; inputDate: string | null }
        >();
        const teacherIds = new Set<string>();
        for (const m of Array.isArray(subjectiveMarks) ? subjectiveMarks : []) {
            if (!m || typeof m !== "object") continue;
            const id = toId((m as { subjective_id?: unknown }).subjective_id);
            if (!id) continue;
            const teacherId = toId((m as { teacher_id?: unknown }).teacher_id);
            const inputDate = toId((m as { input_date?: unknown }).input_date);
            subjectiveInfoById.set(id, {
                mark: toNumber((m as { subjective_mark?: unknown }).subjective_mark),
                teacherId: teacherId || null,
                inputDate: inputDate || null,
            });
            if (teacherId) teacherIds.add(teacherId);
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

            const objective = omr_scan_id ? objectiveTotalByOmrId.get(omr_scan_id) ?? 0 : 0;
            const subjective = subjectiveInfo?.mark ?? 0;
            const total = toNumber((row as { total?: unknown }).total);
            const grade = toId((row as { grade?: unknown }).grade);

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
                objective,
                subjective,
                total,
                grade,
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
            .select("result_id")
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

        const resultIds = (Array.isArray(pendingRows) ? pendingRows : [])
            .map((row: unknown) => {
                if (!row || typeof row !== "object") return "";
                return toId((row as { result_id?: unknown }).result_id);
            })
            .filter(Boolean);

        if (resultIds.length === 0) {
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
            updated: Array.isArray(updatedRows) ? updatedRows.length : 0,
        });
    } catch (err) {
        console.error("COORDINATOR APPROVAL ACTION ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
