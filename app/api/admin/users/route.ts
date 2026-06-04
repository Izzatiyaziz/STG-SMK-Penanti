import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type TeacherRow = {
    teacher_id?: unknown;
    username?: unknown;
    fullname?: unknown;
    email?: unknown;
    status?: unknown;
};

type TeacherRoleRow = {
    teacher_id?: unknown;
    role_id?: unknown;
};

type RoleRow = {
    role_id?: unknown;
    role_name?: unknown;
};

type AdminRow = {
    admin_id?: unknown;
    fullname?: unknown;
};

type StudentRow = {
    student_id?: unknown;
    fullname?: unknown;
    ic_number?: unknown;
    status?: unknown;
    class_id?: unknown;
    stg_classes?: { class_name?: unknown } | null;
};

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");
        // role can be: admin, student, teacher OR any role_name (principal, subject coordinator...)

        // ================= ADMIN =================
        if (role === "admin") {
            const { data, error } = await supabase
                .from("stg_admins")
                .select("admin_id, fullname");

            if (error || !data) {
                console.error("ADMIN FETCH ERROR:", error);
                return NextResponse.json([], { status: 200 });
            }

            return NextResponse.json(
                (data as AdminRow[]).map((a) => ({
                    id: a.admin_id,
                    name: a.fullname ?? "Admin",
                    identifier: a.admin_id,
                    role: "admin",
                }))
            );
        }

        // ================= STUDENT =================
        if (role === "student") {
            const { data, error } = await supabase.from("stg_students").select(`
        student_id,
        fullname,
        ic_number,
        status,
        class_id,
        stg_classes (
          class_name
        )
      `);

            if (error || !data) {
                console.error("STUDENT FETCH ERROR:", error);
                return NextResponse.json([], { status: 200 });
            }

            return NextResponse.json(
                (data as StudentRow[]).map((s) => ({
                    id: s.student_id,
                    name: s.fullname,
                    identifier: s.ic_number,
                    status: s.status ?? "active",
                    class_id: s.class_id,
                    className: s.stg_classes?.class_name ?? null,
                }))
            );
        }

        // ================= TEACHER (ALL or FILTER BY ROLE NAME) =================
        if (
            role === "teacher" ||
            role === "principal" ||
            role === "class teacher" ||
            role === "subject teacher" ||
            role === "subject coordinator"
        ) {
            const { data, error } = await supabaseAdmin
                .from("stg_teachers")
                .select("teacher_id, username, fullname, email, status")
                .order("fullname", { ascending: true });

            if (error || !data) {
                console.error("TEACHER FETCH ERROR:", error);
                return NextResponse.json([], { status: 200 });
            }

            const teacherRows = data as TeacherRow[];
            const teacherIds = teacherRows
                .map((teacher) => String(teacher.teacher_id ?? "").trim())
                .filter(Boolean);

            const { data: teacherRoleRows, error: teacherRoleError } =
                teacherIds.length > 0
                    ? await supabaseAdmin
                          .from("stg_teacher_roles")
                          .select("teacher_id, role_id")
                          .in("teacher_id", teacherIds)
                    : { data: [], error: null };

            if (teacherRoleError) {
                console.error("TEACHER ROLE FETCH ERROR:", teacherRoleError);
            }

            const teacherRoles = (teacherRoleRows ?? []) as TeacherRoleRow[];
            const roleIds = Array.from(
                new Set(
                    teacherRoles
                        .map((row) => String(row.role_id ?? "").trim())
                        .filter(Boolean)
                )
            );

            const { data: roleRows, error: roleError } =
                roleIds.length > 0
                    ? await supabaseAdmin
                          .from("stg_roles")
                          .select("role_id, role_name")
                          .in("role_id", roleIds)
                    : { data: [], error: null };

            if (roleError) {
                console.error("ROLE FETCH ERROR:", roleError);
            }

            const roleNameById = new Map(
                ((roleRows ?? []) as RoleRow[]).map((row) => [
                    String(row.role_id ?? "").trim(),
                    String(row.role_name ?? "").trim(),
                ])
            );
            const rolesByTeacherId = new Map<string, string[]>();

            for (const row of teacherRoles) {
                const teacherId = String(row.teacher_id ?? "").trim();
                const roleName = roleNameById.get(String(row.role_id ?? "").trim());
                if (!teacherId || !roleName) continue;
                rolesByTeacherId.set(teacherId, [
                    ...(rolesByTeacherId.get(teacherId) ?? []),
                    roleName,
                ]);
            }

            let teachers = teacherRows.map((t) => ({
                id: t.teacher_id,
                name: t.fullname,
                identifier: t.username ?? t.teacher_id,
                email: t.email,
                status: t.status ?? "active",
                roles: rolesByTeacherId.get(String(t.teacher_id)) ?? [],
            }));

            if (role !== "teacher") {
                teachers = teachers.filter((t) => t.roles.includes(role));
            }

            return NextResponse.json(teachers, { status: 200 });
        }

        return NextResponse.json([], { status: 200 });
    } catch (error) {
        console.error("FETCH USERS ERROR:", error);
        return NextResponse.json([], { status: 200 });
    }
}
