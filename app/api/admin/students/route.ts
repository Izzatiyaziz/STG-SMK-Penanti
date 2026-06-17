import { NextResponse } from "next/server";
import supabase from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";
import { getClientIp, looksLikeXssAttempt, sanitizePlainText, sanitizeSearchTerm } from "@/lib/security";
import { logSecurityEvent } from "@/lib/security-events";

export const runtime = "nodejs";

type DatabaseErrorLike = {
    message?: unknown;
    details?: unknown;
    code?: unknown;
};

type ClassLookupRow = {
    class_id: string;
    class_name: string;
};

type StudentUpdate = {
    fullname?: string;
    ic_number?: string;
    status?: string;
    class_id?: string | null;
    enrollment_date?: string | null;
    level?: string;
};

function normalizeIcDigits(value: unknown) {
    return String(value ?? "").replace(/\D/g, "");
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error ?? "Ralat tidak dijangka");
}

function toFriendlyStudentError(error: unknown): string {
    const dbError = error as DatabaseErrorLike;
    const message = String(dbError?.message ?? "");
    const details = String(dbError?.details ?? "");
    const code = String(dbError?.code ?? "");

    // Postgres unique constraint on IC number (23505)
    if (
        message.includes("stg_students_ic_number_unique") ||
        details.includes("stg_students_ic_number_unique") ||
        (code === "23505" && (message.toLowerCase().includes("duplicate") || details.toLowerCase().includes("duplicate")))
    ) {
        return "No. Kad Pengenalan ini telah didaftarkan. Sila semak semula atau gunakan rekod pelajar sedia ada.";
    }

    return message || "Ralat tidak dijangka";
}

function formatIcNumber(value: unknown) {
    const digits = normalizeIcDigits(value);
    if (digits.length !== 12) return String(value ?? "").trim();
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
}

function deriveLevelFromEnrollment(enrollmentDate: string | null | undefined) {
    if (!enrollmentDate) return null;
    const d = new Date(enrollmentDate);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    const years = now.getFullYear() - d.getFullYear() + 1;
    const clamped = Math.max(1, Math.min(5, years));
    return String(clamped);
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const id = String(searchParams.get("id") ?? "").trim();

        if (id) {
            const { data: student, error } = await supabase
                .from("stg_students")
                .select("student_id, fullname, ic_number, class_id, status, created_at, enrollment_date, level")
                .eq("student_id", id)
                .single();

            if (error || !student) {
                return NextResponse.json(
                    { success: false, message: "Pelajar tidak dijumpai" },
                    { status: 404 }
                );
            }

            let className: string | null = null;
            if (student.class_id) {
                const { data: cls } = await supabase
                    .from("stg_classes")
                    .select("class_name")
                    .eq("class_id", student.class_id)
                    .single();
                className = cls?.class_name ?? null;
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: student.student_id,
                    name: String(student.fullname ?? "").toUpperCase(),
                    identifier: formatIcNumber(student.ic_number),
                    class_id: student.class_id,
                    className,
                    status: student.status ?? "active",
                    created_at: student.created_at,
                    enrollment_date: student.enrollment_date,
                    level: student.level ?? null,
                },
            });
        }

        // PostgREST .or() uses its own filter grammar, so user input must not
        // contain filter-control characters before being interpolated.
        const rawSearch = String(searchParams.get("search") ?? "").trim();
        const search = sanitizeSearchTerm(rawSearch);
        if (rawSearch && rawSearch !== search) {
            await logSecurityEvent({
                eventType: "filter_injection",
                severity: "high",
                ipAddress: getClientIp(req),
                identifier: guard.session.user_id,
                role: "admin",
                endpoint: "/api/admin/students",
                details: { reason: "Aksara kawalan penapis PostgREST dikesan" },
            });
        }
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get("page_size") ?? "100", 10)));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, class_id, status, created_at, enrollment_date, level", { count: "exact" })
            .order("fullname", { ascending: true })
            .range(from, to);

        if (search) {
            query = query.or(`fullname.ilike.%${search}%,ic_number.ilike.%${search}%`);
        }

        const { data: students, error, count } = await query;

        if (error) {
            return NextResponse.json({ success: true, data: [], count: 0 });
        }

        const classIds = Array.from(
            new Set((students ?? []).map((s) => s.class_id as string).filter(Boolean))
        );

        const { data: classes } = classIds.length
            ? await supabase
                  .from("stg_classes")
                  .select("class_id, class_name")
                  .in("class_id", classIds)
            : { data: [] as ClassLookupRow[] };

        const classById = new Map(
            ((classes ?? []) as ClassLookupRow[]).map((c) => [c.class_id, c.class_name])
        );

        const formatted = (students ?? []).map((s) => ({
            id: s.student_id,
            name: String(s.fullname ?? "").toUpperCase(),
            identifier: formatIcNumber(s.ic_number),
            class_id: s.class_id,
            className: s.class_id ? classById.get(s.class_id) ?? "" : "",
            status: s.status ?? "active",
            created_at: s.created_at,
            enrollment_date: s.enrollment_date,
            level: s.level ?? null,
        }));

        return NextResponse.json({
            success: true,
            data: formatted,
            count: count ?? formatted.length,
            page,
            page_size: pageSize,
            total_pages: Math.ceil((count ?? formatted.length) / pageSize),
        });
    } catch (err: unknown) {
        console.error("GET STUDENTS ERROR:", err);
        return NextResponse.json(
            { success: false, message: "Ralat pelayan", error: getErrorMessage(err) },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const body = await req.json();

        const rawFullname = String(body?.fullname ?? "").trim();
        const fullname = sanitizePlainText(rawFullname, 150).toUpperCase();
        if (looksLikeXssAttempt(rawFullname)) {
            await logSecurityEvent({
                eventType: "xss_attempt",
                severity: "high",
                ipAddress: getClientIp(req),
                identifier: guard.session.user_id,
                role: "admin",
                endpoint: "/api/admin/students",
                details: { reason: "Markup mencurigakan dikesan pada nama pelajar" },
            });
        }
        const ic_number = formatIcNumber(body?.ic_number);
        const class_id =
            body?.class_id === null || body?.class_id === undefined
                ? null
                : String(body.class_id).trim();
        const enrollment_date = body?.enrollment_date
            ? String(body.enrollment_date).trim()
            : null;

        const levelFromEnrollment = deriveLevelFromEnrollment(enrollment_date);
        const level = String(body?.level ?? levelFromEnrollment ?? "").trim() || null;

        if (!fullname || !ic_number) {
            return NextResponse.json(
                { message: "Nama penuh dan IC diperlukan" },
                { status: 400 }
            );
        }

        if (normalizeIcDigits(ic_number).length !== 12) {
            return NextResponse.json(
                { message: "Sila masukkan No. Kad Pengenalan yang sah (12 digit)" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("stg_students")
            .insert({
                fullname,
                ic_number,
                class_id,
                status: "active",
                enrollment_date,
                level,
            })
            .select("student_id")
            .single();

        if (error) {
            return NextResponse.json(
                { message: toFriendlyStudentError(error) },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: true, id: data?.student_id },
            { status: 201 }
        );
    } catch (err: unknown) {
        console.error("ADD STUDENT ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan", error: getErrorMessage(err) },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const id = String(searchParams.get("id") ?? "").trim();

        if (!id) {
            return NextResponse.json(
                { message: "ID pelajar diperlukan" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const rawFullname = String(body?.fullname ?? body?.name ?? "").trim();
        const fullname = sanitizePlainText(rawFullname, 150).toUpperCase();
        if (looksLikeXssAttempt(rawFullname)) {
            await logSecurityEvent({
                eventType: "xss_attempt",
                severity: "high",
                ipAddress: getClientIp(req),
                identifier: guard.session.user_id,
                role: "admin",
                endpoint: "/api/admin/students",
                details: { reason: "Markup mencurigakan dikesan pada nama pelajar" },
            });
        }
        const ic_number = formatIcNumber(body?.ic_number ?? body?.identifier);
        const status = body?.status ? String(body.status).trim() : undefined;
        const class_id =
            body && typeof body === "object" && "class_id" in body
                ? body.class_id === null || body.class_id === undefined
                    ? null
                    : String(body.class_id).trim()
                : undefined;
        const enrollment_date = body?.enrollment_date
            ? String(body.enrollment_date).trim()
            : undefined;

        if (status && !["active", "inactive"].includes(status)) {
            return NextResponse.json(
                { message: "Status pelajar tidak sah" },
                { status: 400 }
            );
        }

        const { data: currentStudent } = status === "inactive"
            ? await supabase
                  .from("stg_students")
                  .select("student_id, class_id, level, enrollment_date")
                  .eq("student_id", id)
                  .single()
            : { data: null };

        const update: StudentUpdate = {};
        if (fullname) update.fullname = fullname;
        if (ic_number) {
            if (normalizeIcDigits(ic_number).length !== 12) {
                return NextResponse.json(
                    { message: "Sila masukkan No. Kad Pengenalan yang sah (12 digit)" },
                    { status: 400 }
                );
            }
            update.ic_number = ic_number;
        }
        if (status) update.status = status;
        if (class_id !== undefined) update.class_id = class_id;
        if (status === "inactive") update.class_id = null;
        if (enrollment_date !== undefined) {
            update.enrollment_date = enrollment_date || null;
            const lvl = deriveLevelFromEnrollment(enrollment_date);
            if (lvl) update.level = lvl;
        }

        const { error } = await supabase
            .from("stg_students")
            .update(update)
            .eq("student_id", id);

        if (error) {
            return NextResponse.json(
                { message: toFriendlyStudentError(error) },
                { status: 400 }
            );
        }

        if (status === "inactive") {
            const endDate = todayDate();
            const { data: openHistory, error: historyFindError } = await supabase
                .from("stg_student_class_history")
                .select("history_id")
                .eq("student_id", id)
                .is("end_date", null)
                .order("created_at", { ascending: false })
                .limit(1);

            if (historyFindError) {
                console.error("FIND STUDENT HISTORY ERROR:", historyFindError);
            } else if (openHistory && openHistory.length > 0) {
                const { error: historyUpdateError } = await supabase
                    .from("stg_student_class_history")
                    .update({ end_date: endDate })
                    .eq("history_id", openHistory[0].history_id);

                if (historyUpdateError) {
                    console.error("UPDATE STUDENT HISTORY ERROR:", historyUpdateError);
                }
            } else if (currentStudent?.class_id) {
                const { error: historyInsertError } = await supabase
                    .from("stg_student_class_history")
                    .insert({
                        student_id: id,
                        class_id: currentStudent.class_id,
                        level: currentStudent.level,
                        start_date: currentStudent.enrollment_date || endDate,
                        end_date: endDate,
                    });

                if (historyInsertError) {
                    console.error("INSERT STUDENT HISTORY ERROR:", historyInsertError);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("UPDATE STUDENT ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan", error: getErrorMessage(err) },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const id = String(searchParams.get("id") ?? "").trim();

        if (!id) {
            return NextResponse.json(
                { message: "ID pelajar diperlukan" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_students")
            .delete()
            .eq("student_id", id);

        if (error) {
            return NextResponse.json(
                {
                    message:
                        "Gagal padam. Mungkin pelajar mempunyai data berkaitan.",
                    error: error.message,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("DELETE STUDENT ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan", error: getErrorMessage(err) },
            { status: 500 }
        );
    }
}
