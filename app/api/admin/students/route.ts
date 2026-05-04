import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function deriveLevelFromEnrollment(enrollmentDate: string | null | undefined) {
    if (!enrollmentDate) return null;
    const d = new Date(enrollmentDate);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    const years = now.getFullYear() - d.getFullYear() + 1;
    const clamped = Math.max(1, Math.min(5, years));
    return String(clamped);
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
                    name: student.fullname,
                    identifier: student.ic_number,
                    class_id: student.class_id,
                    className,
                    status: student.status ?? "active",
                    created_at: student.created_at,
                    enrollment_date: student.enrollment_date,
                    level: student.level ?? null,
                },
            });
        }

        const { data: students, error } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, class_id, status, created_at, enrollment_date, level")
            .order("fullname", { ascending: true });

        if (error) {
            return NextResponse.json(
                { success: true, data: [] },
                { status: 200 }
            );
        }

        const classIds = Array.from(
            new Set((students ?? []).map((s) => s.class_id as string).filter(Boolean))
        );

        const { data: classes } = classIds.length
            ? await supabase
                  .from("stg_classes")
                  .select("class_id, class_name")
                  .in("class_id", classIds)
            : { data: [] as any[] };

        const classById = new Map(
            (classes ?? []).map((c: any) => [c.class_id, c.class_name])
        );

        const formatted = (students ?? []).map((s) => ({
            id: s.student_id,
            name: s.fullname,
            identifier: s.ic_number,
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
            count: formatted.length,
        });
    } catch (err: any) {
        console.error("GET STUDENTS ERROR:", err);
        return NextResponse.json(
            { success: false, message: "Ralat pelayan", error: err.message },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const body = await req.json();

        const fullname = String(body?.fullname ?? "").trim();
        const ic_number = String(body?.ic_number ?? "").trim();
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
                { message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: true, id: data?.student_id },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("ADD STUDENT ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan", error: err.message },
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
        const fullname = String(body?.fullname ?? body?.name ?? "").trim();
        const ic_number = String(body?.ic_number ?? body?.identifier ?? "").trim();
        const status = body?.status ? String(body.status).trim() : undefined;
        const class_id =
            body?.class_id === null || body?.class_id === undefined
                ? null
                : String(body.class_id).trim();
        const enrollment_date = body?.enrollment_date
            ? String(body.enrollment_date).trim()
            : undefined;

        const update: any = {};
        if (fullname) update.fullname = fullname;
        if (ic_number) update.ic_number = ic_number;
        if (status) update.status = status;
        if (class_id !== undefined) update.class_id = class_id;
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
                { message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("UPDATE STUDENT ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan", error: err.message },
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
    } catch (err: any) {
        console.error("DELETE STUDENT ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan", error: err.message },
            { status: 500 }
        );
    }
}
