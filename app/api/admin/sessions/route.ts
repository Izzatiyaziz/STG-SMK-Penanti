import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

type SessionRow = {
    session_id: string;
    user_id: string;
    user_name?: string | null;
    role: string;
    action?: string | null;
    login_time: string;
    logout_time?: string | null;
};

function normalizeRole(role?: string | null) {
    return String(role ?? "").toLowerCase().trim();
}

function uniqueSessionIds(sessions: SessionRow[], role: string) {
    return Array.from(
        new Set(
            sessions
                .filter((session) => normalizeRole(session.role) === role)
                .map((session) => String(session.user_id ?? "").trim())
                .filter(Boolean)
        )
    );
}

function uniqueValues(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseMarkUpdateAction(action?: string | null) {
    const value = String(action ?? "");
    const match = value.match(
        /^Kemaskini Markah:\s*([^|]+)\|\s*Exam:\s*([^|]+)\|\s*Kelas:\s*([^|]+)\|\s*(.+)$/i
    );

    if (!match) return null;

    return {
        subjectId: match[1].trim(),
        examId: match[2].trim(),
        classId: match[3].trim(),
        suffix: match[4].trim(),
    };
}

function parseOmrReviewAction(action?: string | null) {
    const value = String(action ?? "");
    const match = value.match(
        /^Semak OMR:\s*Pelajar\s+([^|]+)\|\s*Subject:\s*([^|]+)\|\s*Exam:\s*([^|]+)(?:\|\s*(.+))?$/i
    );

    if (!match) return null;

    return {
        studentId: match[1].trim(),
        subjectId: match[2].trim(),
        examId: match[3].trim(),
        suffix: match[4]?.trim() ?? "",
    };
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const limit = Math.min(
            Math.max(Number(searchParams.get("limit") ?? 50), 1),
            200
        );

        const [{ data: sessions, error: sessionError }, { data: events, error: eventError }] =
            await Promise.all([
                supabaseAdmin
                    .from("stg_sessions")
                    .select(
                        "session_id, user_id, user_name, role, action, login_time, logout_time"
                    )
                    .order("login_time", { ascending: false })
                    .limit(limit),
                supabaseAdmin
                    .from("stg_security_events")
                    .select(
                        "event_id, event_type, severity, status, ip_address, identifier, role, endpoint, details, created_at"
                    )
                    .order("created_at", { ascending: false })
                    .limit(limit),
            ]);

        if (sessionError) {
            return NextResponse.json(
                { message: sessionError.message, data: [] },
                { status: 500, headers: NO_STORE_HEADERS }
            );
        }

        if (eventError) {
            console.error("SECURITY EVENTS LIST ERROR:", eventError.message);
        }

        const sessionData = (sessions ?? []) as SessionRow[];
        const teacherIds = uniqueSessionIds(sessionData, "teacher");
        const studentIds = uniqueSessionIds(sessionData, "student");
        const markActions = sessionData
            .map((session) => parseMarkUpdateAction(session.action))
            .filter((action): action is NonNullable<ReturnType<typeof parseMarkUpdateAction>> => Boolean(action));
        const omrActions = sessionData
            .map((session) => parseOmrReviewAction(session.action))
            .filter((action): action is NonNullable<ReturnType<typeof parseOmrReviewAction>> => Boolean(action));
        const sessionAndTargetStudentIds = uniqueValues([
            ...studentIds,
            ...omrActions.map((action) => action.studentId),
        ]);
        const subjectIds = uniqueValues([
            ...markActions.map((action) => action.subjectId),
            ...omrActions.map((action) => action.subjectId),
        ]);
        const examIds = uniqueValues([
            ...markActions.map((action) => action.examId),
            ...omrActions.map((action) => action.examId),
        ]);
        const [teacherLookup, studentLookup, subjectLookup, examLookup] = await Promise.all([
            teacherIds.length
                ? supabaseAdmin
                      .from("stg_teachers")
                      .select("teacher_id, username")
                      .in("teacher_id", teacherIds)
                : Promise.resolve({ data: [], error: null }),
            sessionAndTargetStudentIds.length
                ? supabaseAdmin
                      .from("stg_students")
                      .select("student_id, ic_number, class_id")
                      .in("student_id", sessionAndTargetStudentIds)
                : Promise.resolve({ data: [], error: null }),
            subjectIds.length
                ? supabaseAdmin
                      .from("stg_subjects")
                      .select("subject_id, subject_name")
                      .in("subject_id", subjectIds)
                : Promise.resolve({ data: [], error: null }),
            examIds.length
                ? supabaseAdmin
                      .from("stg_exams")
                      .select("exam_id, exam_name")
                      .in("exam_id", examIds)
                : Promise.resolve({ data: [], error: null }),
        ]);
        const identifierBySessionUserId = new Map<string, string>();
        const studentClassIdById = new Map<string, string>();
        const classLabelById = new Map<string, string>();
        const subjectLabelById = new Map<string, string>();
        const examLabelById = new Map<string, string>();

        for (const teacher of teacherLookup.data ?? []) {
            const id = String(teacher.teacher_id ?? "").trim();
            const username = String(teacher.username ?? "").trim();
            if (id && username) identifierBySessionUserId.set(id, username);
        }

        for (const student of studentLookup.data ?? []) {
            const id = String(student.student_id ?? "").trim();
            const icNumber = String(student.ic_number ?? "").trim();
            const classId = String(student.class_id ?? "").trim();
            if (id && icNumber) identifierBySessionUserId.set(id, icNumber);
            if (id && classId) studentClassIdById.set(id, classId);
        }

        const classIds = uniqueValues([
            ...markActions.map((action) => action.classId),
            ...omrActions.map((action) => studentClassIdById.get(action.studentId) ?? ""),
        ]);
        const classLookup = classIds.length
            ? await supabaseAdmin
                  .from("stg_classes")
                  .select("class_id, class_name, grade")
                  .in("class_id", classIds)
            : { data: [], error: null };

        for (const classRow of classLookup.data ?? []) {
            const id = String(classRow.class_id ?? "").trim();
            const className = String(classRow.class_name ?? "").trim();
            const grade = String(classRow.grade ?? "").trim();
            const label = [grade, className].filter(Boolean).join(" ").trim();
            if (id) classLabelById.set(id, label || id);
        }

        for (const subject of subjectLookup.data ?? []) {
            const id = String(subject.subject_id ?? "").trim();
            const subjectName = String(subject.subject_name ?? "").trim();
            if (id) subjectLabelById.set(id, subjectName || id);
        }

        for (const exam of examLookup.data ?? []) {
            const id = String(exam.exam_id ?? "").trim();
            const examName = String(exam.exam_name ?? "").trim();
            if (id) examLabelById.set(id, examName || id);
        }

        function formatSessionAction(action?: string | null) {
            const markAction = parseMarkUpdateAction(action);
            if (markAction) {
                return [
                    `Kemaskini markah: Subjek: ${subjectLabelById.get(markAction.subjectId) ?? "-"}`,
                    `Kelas: ${classLabelById.get(markAction.classId) ?? "-"}`,
                    `Peperiksaan: ${examLabelById.get(markAction.examId) ?? "-"}`,
                ]
                    .filter(Boolean)
                    .join(", ");
            }

            const omrAction = parseOmrReviewAction(action);
            if (omrAction) {
                const classId = studentClassIdById.get(omrAction.studentId) ?? "";
                return [
                    `Semak OMR: Subjek: ${subjectLabelById.get(omrAction.subjectId) ?? "-"}`,
                    `Kelas: ${classLabelById.get(classId) ?? "-"}`,
                    `Peperiksaan: ${examLabelById.get(omrAction.examId) ?? "-"}`,
                ]
                    .filter(Boolean)
                    .join(", ");
            }

            return action;
        }

        const sessionRows = sessionData.map((row) => ({
            ...row,
            user_name: identifierBySessionUserId.get(String(row.user_id ?? "").trim()) ?? row.user_id,
            action: formatSessionAction(row.action),
            record_type: "session",
            severity: "low",
            status: "success",
            ip_address: null,
            identifier: row.user_id,
            endpoint: null,
            details: null,
            event_time: row.login_time,
        }));

        const securityRows = (events ?? []).map((row) => ({
            session_id: row.event_id,
            user_id: row.identifier ?? "Tidak diketahui",
            user_name: row.identifier ?? "Tidak diketahui",
            role: row.role ?? "unknown",
            action: row.event_type,
            login_time: row.created_at,
            logout_time: null,
            record_type: "security",
            severity: row.severity,
            status: row.status,
            ip_address: row.ip_address,
            identifier: row.identifier,
            endpoint: row.endpoint,
            details: row.details,
            event_time: row.created_at,
        }));

        const combined = [...sessionRows, ...securityRows]
            .sort(
                (a, b) =>
                    new Date(b.event_time).getTime() -
                    new Date(a.event_time).getTime()
            )
            .slice(0, limit);

        return NextResponse.json({ data: combined }, { headers: NO_STORE_HEADERS });
    } catch (err) {
        console.error("SESSIONS LIST ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500, headers: NO_STORE_HEADERS });
    }
}
