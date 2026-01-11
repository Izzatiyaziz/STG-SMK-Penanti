import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { role } = body;

        if (!role) {
            return NextResponse.json(
                { message: "Peranan diperlukan" },
                { status: 400 }
            );
        }

        // ================= STUDENT =================
        if (role === "student") {
            const { ic_number } = body;

            if (!ic_number) {
                return NextResponse.json(
                    { message: "IC number diperlukan" },
                    { status: 400 }
                );
            }

            const { data: student, error } = await supabase
                .from("stg_students")
                .select("student_id, status")
                .eq("ic_number", ic_number)
                .single();

            if (error || !student) {
                return NextResponse.json(
                    { message: "Pelajar tidak dijumpai" },
                    { status: 401 }
                );
            }

            if (student.status !== "active") {
                return NextResponse.json(
                    { message: "Akaun pelajar tidak aktif" },
                    { status: 403 }
                );
            }

            return NextResponse.json({
                role: "student",
                user_id: student.student_id,
            });
        }

        // ================= ADMIN =================
        if (role === "admin") {
            const { admin_id, password } = body;

            if (!admin_id || !password) {
                return NextResponse.json(
                    { message: "ID Admin dan kata laluan diperlukan" },
                    { status: 400 }
                );
            }

            const { data: admin, error } = await supabase
                .from("stg_admins")
                .select("admin_id, password")
                .eq("admin_id", admin_id)
                .single();

            if (error || !admin) {
                return NextResponse.json(
                    { message: "Kelayakan tidak sah" },
                    { status: 401 }
                );
            }

            const valid = await bcrypt.compare(password, admin.password);
            if (!valid) {
                return NextResponse.json(
                    { message: "Kelayakan tidak sah" },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                role: "admin",
                user_id: admin.admin_id,
            });
        }

        // ================= TEACHER =================
        if (role === "teacher") {
            const { username, password } = body;

            if (!username || !password) {
                return NextResponse.json(
                    { message: "ID Guru dan kata laluan diperlukan" },
                    { status: 400 }
                );
            }

            const { data: teacher, error } = await supabase
                .from("stg_teachers")
                .select("teacher_id, password, fullname")
                .eq("username", username)
                .single();

            if (error || !teacher) {
                return NextResponse.json(
                    { message: "Kelayakan tidak sah" },
                    { status: 401 }
                );
            }

            const valid = await bcrypt.compare(password, teacher.password);
            if (!valid) {
                return NextResponse.json(
                    { message: "Kelayakan tidak sah" },
                    { status: 401 }
                );
            }

            const { data: teacherRoles } = await supabase
                .from("stg_teacher_roles")
                .select("role_id")
                .eq("teacher_id", teacher.teacher_id);

            const roleIds = teacherRoles?.map((r) => r.role_id) ?? [];

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
                user_id: teacher.teacher_id,
                fullname: teacher.fullname,
                roles: roleNames,
            });
        }

        return NextResponse.json(
            { message: "Peranan tidak sah" },
            { status: 400 }
        );
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}