import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

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
                { status: 500 }
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
        const classIds = Array.from(new Set(markActions.map((action) => action.classId).filter(Boolean)));
        const examIds = Array.from(new Set(markActions.map((action) => action.examId).filter(Boolean)));
        const [teacherLookup, studentLookup, classLookup, examLookup] = await Promise.all([
            teacherIds.length
                ? supabaseAdmin
                      .from("stg_teachers")
                      .select("teacher_id, username")
                      .in("teacher_id", teacherIds)
                : Promise.resolve({ data: [], error: null }),
            studentIds.length
                ? supabaseAdmin
                      .from("stg_students")
                      .select("student_id, ic_number")
                      .in("student_id", studentIds)
                : Promise.resolve({ data: [], error: null }),
            classIds.length
                ? supabaseAdmin
                      .from("stg_classes")
                      .select("class_id, class_name, grade")
                      .in("class_id", classIds)
                : Promise.resolve({ data: [], error: null }),
            examIds.length
                ? supabaseAdmin
                      .from("stg_exams")
                      .select("exam_id, exam_name")
                      .in("exam_id", examIds)
                : Promise.resolve({ data: [], error: null }),
        ]);
        const identifierBySessionUserId = new Map<string, string>();
        const classLabelById = new Map<string, string>();
        const examLabelById = new Map<string, string>();

        for (const teacher of teacherLookup.data ?? []) {
            const id = String(teacher.teacher_id ?? "").trim();
            const username = String(teacher.username ?? "").trim();
            if (id && username) identifierBySessionUserId.set(id, username);
        }

        for (const student of studentLookup.data ?? []) {
            const id = String(student.student_id ?? "").trim();
            const icNumber = String(student.ic_number ?? "").trim();
            if (id && icNumber) identifierBySessionUserId.set(id, icNumber);
        }

        for (const classRow of classLookup.data ?? []) {
            const id = String(classRow.class_id ?? "").trim();
            const className = String(classRow.class_name ?? "").trim();
            const grade = String(classRow.grade ?? "").trim();
            const label = [grade, className].filter(Boolean).join(" ").trim();
            if (id) classLabelById.set(id, label || id);
        }

        for (const exam of examLookup.data ?? []) {
            const id = String(exam.exam_id ?? "").trim();
            const examName = String(exam.exam_name ?? "").trim();
            if (id) examLabelById.set(id, examName || id);
        }

        function formatSessionAction(action?: string | null) {
            const markAction = parseMarkUpdateAction(action);
            if (!markAction) return action;

            return [
                `Kemaskini markah kelas: ${classLabelById.get(markAction.classId) ?? "-"}`,
                `Peperiksaan: ${examLabelById.get(markAction.examId) ?? "-"}`,
                markAction.suffix,
            ]
                .filter(Boolean)
                .join(", ");
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

        return NextResponse.json({ data: combined });
    } catch (err) {
        console.error("SESSIONS LIST ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
