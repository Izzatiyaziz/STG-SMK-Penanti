import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { role, password } = body;

        if (!role || !password) {
            return NextResponse.json(
                { message: "Peranan dan kata laluan diperlukan" },
                { status: 400 }
            );
        }

        // ================= STUDENT =================
        if (role === "student") {
            const { ic_number } = body;

            const { data: student, error } = await supabase
                .from("stg_students")
                .select("student_id, password")
                .eq("ic_number", ic_number)
                .single();

            if (error || !student) {
                return NextResponse.json(
                    { message: "Kelayakan tidak sah" },
                    { status: 401 }
                );
            }

            const valid = await bcrypt.compare(password, student.password);
            if (!valid) {
                return NextResponse.json(
                    { message: "Kelayakan tidak sah" },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                role: "student",
                user_id: student.student_id,
            });
        }

        // ================= ADMIN =================
        if (role === "admin") {
            const { admin_id } = body;

            const { data: admin, error } = await supabase
                .from("stg_admins")
                .select("admin_id,username, password")
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
            const { username } = body;

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
                user_id: teacher.teacher_id,
                fullname: teacher.fullname,
                roles: roleNames,
            });
        }

        return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
