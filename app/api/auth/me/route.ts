import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getServerSession } from "@/lib/auth";

export async function POST() {
    try {
        const session = await getServerSession();
        const role = session?.userType;
        const user_id = session?.user_id;

        if (!role || !user_id) {
            return NextResponse.json(
                { message: "Unauthenticated" },
                { status: 401 }
            );
        }

        // ================= STUDENT =================
        if (role === "student") {
            const { data, error } = await supabase
                .from("stg_students")
                .select("student_id, ic_number, fullname, status, class_id, created_at, level")
                .eq("student_id", user_id)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { message: "Pengguna tidak dijumpai" },
                    { status: 401 }
                );
            }

            let class_name = "";
            if (data.class_id) {
                const { data: cls } = await supabase
                    .from("stg_classes")
                    .select("class_name")
                    .eq("class_id", data.class_id)
                    .maybeSingle();
                class_name = String(cls?.class_name ?? "").trim();
            }

            return NextResponse.json({
                role: "student",
                ic_number: data.ic_number,
                name: data.fullname,
                status: data.status ?? "active",
                class_name,
                level: data.level ?? null,
                created_at: data.created_at,
            });
        }

        // ================= ADMIN =================
        if (role === "admin") {
            const { data, error } = await supabase
                .from("stg_admins")
                .select("admin_id, fullname")
                .eq("admin_id", user_id)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { message: "Pengguna tidak dijumpai" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                role: "admin",
                name: data.fullname,
                email: "admin@smkpenanti.edu.my",
                avatar: "/img/admin-avatar.png",
            });
        }

        // ================= TEACHER =================
        if (role === "teacher") {
            const { data: teacher, error } = await supabase
                .from("stg_teachers")
                .select("teacher_id, fullname, email, is_first_login")
                .eq("teacher_id", user_id)
                .single();

            if (error || !teacher) {
                return NextResponse.json(
                    { message: "Pengguna tidak dijumpai" },
                    { status: 404 }
                );
            }

            // 1️⃣ Get role IDs
            const { data: teacherRoles } = await supabase
                .from("stg_teacher_roles")
                .select("role_id")
                .eq("teacher_id", teacher.teacher_id);

            const roleIds = teacherRoles?.map((r) => r.role_id) ?? [];

            // 2️⃣ Get role names
            let roleNames: string[] = [];

            if (roleIds.length > 0) {
                const { data: roles } = await supabase
                    .from("stg_roles")
                    .select("role_name")
                    .in("role_id", roleIds);

                roleNames = roles?.map((r) => r.role_name) ?? [];
            }

            return NextResponse.json({
                role: "teacher",
                name: teacher.fullname,
                email: teacher.email,
                roles: roleNames,
                avatar: "/img/teacher-avatar.png",
                // First-login password change is disabled (teachers can proceed directly).
                must_change_password: false,
            });
        }

        return NextResponse.json({ message: "Peranan tidak sah" }, { status: 400 });
    } catch (err) {
        console.error("FETCH ME ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
