import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

function normalize(value: unknown) {
    return String(value ?? "").toLowerCase().trim();
}

async function isCoordinatorForSubject(params: {
    coordinator_teacher_id: string;
    subject_id: string;
}) {
    const { coordinator_teacher_id, subject_id } = params;
    const { data, error } = await supabase
        .from("stg_subject_coordinators")
        .select("subject_coordinator_id")
        .eq("teacher_id", coordinator_teacher_id)
        .eq("subject_id", subject_id)
        .limit(1);

    if (error) return false;
    return Array.isArray(data) && data.length > 0;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const coordinator_teacher_id = String(
            searchParams.get("coordinator_teacher_id") ?? ""
        ).trim();
        const subject_id = String(searchParams.get("subject_id") ?? "").trim();

        if (!coordinator_teacher_id || !subject_id) {
            return NextResponse.json(
                { message: "coordinator_teacher_id dan subject_id diperlukan" },
                { status: 400 }
            );
        }

        const ok = await isCoordinatorForSubject({
            coordinator_teacher_id,
            subject_id,
        });
        if (!ok) {
            return NextResponse.json(
                { message: "Forbidden" },
                { status: 403 }
            );
        }

        const [{ data: subject }, { data: coordinator }, { data: classes }, { data: teachers }, { data: assignments }] =
            await Promise.all([
                supabase
                    .from("stg_subjects")
                    .select("subject_id, subject_name")
                    .eq("subject_id", subject_id)
                    .single(),
                supabase
                    .from("stg_teachers")
                    .select("teacher_id, fullname")
                    .eq("teacher_id", coordinator_teacher_id)
                    .single(),
                supabase
                    .from("stg_classes")
                    .select("class_id, class_name, grade")
                    .order("grade", { ascending: true })
                    .order("class_name", { ascending: true }),
                supabase
                    .from("stg_teachers")
                    .select("teacher_id, fullname, status")
                    .order("fullname", { ascending: true }),
                supabase
                    .from("stg_teacher_subject")
                    .select("teacher_subject_id, teacher_id, class_id")
                    .eq("subject_id", subject_id),
            ]);

        const activeTeachers = (teachers ?? []).filter((t: any) => {
            const status = normalize(t?.status);
            return !status || status === "active";
        });

        return NextResponse.json({
            subject: subject
                ? { id: subject.subject_id, name: subject.subject_name }
                : null,
            coordinator: coordinator
                ? { id: coordinator.teacher_id, name: coordinator.fullname }
                : null,
            classes: (classes ?? []).map((c: any) => ({
                id: c.class_id,
                name: c.class_name,
                grade: c.grade,
            })),
            teachers: activeTeachers.map((t: any) => ({
                id: t.teacher_id,
                name: t.fullname,
            })),
            assignments: (assignments ?? []).map((a: any) => ({
                id: a.teacher_subject_id,
                teacher_id: a.teacher_id,
                class_id: a.class_id,
            })),
        });
    } catch (err) {
        console.error("GET coordinator teacher-subject FAILED:", err);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const coordinator_teacher_id = String(
            body?.coordinator_teacher_id ?? ""
        ).trim();
        const subject_id = String(body?.subject_id ?? "").trim();
        const class_id = String(body?.class_id ?? "").trim();
        const teacher_id = String(body?.teacher_id ?? "").trim(); // optional: empty => unassign

        if (!coordinator_teacher_id || !subject_id || !class_id) {
            return NextResponse.json(
                { message: "coordinator_teacher_id, subject_id, class_id diperlukan" },
                { status: 400 }
            );
        }

        const ok = await isCoordinatorForSubject({
            coordinator_teacher_id,
            subject_id,
        });
        if (!ok) {
            return NextResponse.json(
                { message: "Forbidden" },
                { status: 403 }
            );
        }

        // If unassign requested, remove any existing assignment(s) for this subject+class.
        if (!teacher_id) {
            const { error } = await supabase
                .from("stg_teacher_subject")
                .delete()
                .eq("subject_id", subject_id)
                .eq("class_id", class_id);

            if (error) {
                return NextResponse.json(
                    { message: error.message },
                    { status: 400 }
                );
            }

            return NextResponse.json({ success: true, action: "unassigned" });
        }

        // Ensure the target teacher exists.
        const { data: teacher, error: teacherErr } = await supabase
            .from("stg_teachers")
            .select("teacher_id, status")
            .eq("teacher_id", teacher_id)
            .single();

        if (teacherErr || !teacher) {
            return NextResponse.json(
                { message: "Guru tidak dijumpai" },
                { status: 404 }
            );
        }

        // Replace any existing assignment for this subject+class (single-teacher-per-class-per-subject).
        const { error: delErr } = await supabase
            .from("stg_teacher_subject")
            .delete()
            .eq("subject_id", subject_id)
            .eq("class_id", class_id);

        if (delErr) {
            return NextResponse.json(
                { message: delErr.message },
                { status: 400 }
            );
        }

        const { data: inserted, error: insErr } = await supabase
            .from("stg_teacher_subject")
            .insert({ teacher_id, subject_id, class_id })
            .select("teacher_subject_id")
            .single();

        if (insErr) {
            return NextResponse.json(
                { message: insErr.message },
                { status: 400 }
            );
        }

        // Ensure the teacher has "subject teacher" role.
        const { data: roleRow, error: roleErr } = await supabase
            .from("stg_roles")
            .select("role_id")
            .eq("role_name", "subject teacher")
            .single();

        if (!roleErr && roleRow?.role_id) {
            const role_id = String(roleRow.role_id);

            const { data: existingRoleRows, error: existingRoleErr } =
                await supabase
                    .from("stg_teacher_roles")
                    .select("teacher_roles_id")
                    .eq("teacher_id", teacher_id)
                    .eq("role_id", role_id)
                    .limit(1);

            if (!existingRoleErr) {
                const hasRole =
                    Array.isArray(existingRoleRows) && existingRoleRows.length > 0;
                if (!hasRole) {
                    await supabase.from("stg_teacher_roles").insert({
                        teacher_id,
                        role_id,
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            id: inserted?.teacher_subject_id ?? null,
            action: "assigned",
        });
    } catch (err) {
        console.error("POST coordinator teacher-subject FAILED:", err);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}

