import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
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
                data.map((a: any) => ({
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
                data.map((s: any) => ({
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
            const { data, error } = await supabase.from("stg_teachers").select(
                `
          teacher_id,
          username,
          fullname,
          email,
          stg_teacher_roles (
            stg_roles (
              role_name
            )
          )
        `
            );

            if (error || !data) {
                console.error("TEACHER FETCH ERROR:", error);
                return NextResponse.json([], { status: 200 });
            }

            let teachers = data.map((t: any) => ({
                id: t.teacher_id,
                name: t.fullname,
                identifier: t.username ?? t.teacher_id,
                email: t.email,
                roles: (t.stg_teacher_roles || []).map(
                    (tr: any) => tr?.stg_roles?.role_name
                ),
            }));

            if (role !== "teacher") {
                teachers = teachers.filter((t: any) => t.roles.includes(role));
            }

            return NextResponse.json(teachers, { status: 200 });
        }

        return NextResponse.json([], { status: 200 });
    } catch (error) {
        console.error("FETCH USERS ERROR:", error);
        return NextResponse.json([], { status: 200 });
    }
}
