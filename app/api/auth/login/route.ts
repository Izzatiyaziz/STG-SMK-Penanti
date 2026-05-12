import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { role } = body;

        if (!role) {
            return NextResponse.json({ message: "Jawatan diperlukan" }, { status: 400 });
        }

        async function createSessionLog(params: {
            user_id: string;
            user_name?: string | null;
            role: "admin" | "teacher" | "student";
        }) {
            try {
                const { data, error } = await supabase
                    .from("stg_sessions")
                    .insert({
                        user_id: params.user_id,
                        user_name: params.user_name ?? null,
                        role: params.role,
                        action: "Log Masuk",
                    })
                    .select("session_id")
                    .single();

                if (error) return null;
                return data?.session_id ?? null;
            } catch {
                return null;
            }
        }

        // ================= STUDENT =================
        if (role === "student") {
            const { ic_number } = body;
            if (!ic_number) return NextResponse.json({ message: "Nombor KP diperlukan" }, { status: 400 });

            const { data: student, error } = await supabase
                .from("stg_students")
                .select("student_id, fullname, status")
                .eq("ic_number", ic_number)
                .single();

            if (error || !student) return NextResponse.json({ message: "Pelajar tidak dijumpai" }, { status: 401 });
            if (student.status !== "active") return NextResponse.json({ message: "Akaun pelajar tidak aktif" }, { status: 403 });

            const session_id = await createSessionLog({
                user_id: String(student.student_id),
                user_name: student.fullname ?? null,
                role: "student",
            });

            const response = NextResponse.json({
                role: "student",
                user_id: student.student_id,
                session_id,
            });
            setSessionCookie(response, {
                userType: "student",
                role: "student",
                user_id: String(student.student_id),
                session_id,
                name: student.fullname ?? null,
            });
            return response;
        }

        // ================= ADMIN =================
        if (role === "admin") {
            const { admin_id, password } = body;
            if (!admin_id || !password) return NextResponse.json({ message: "ID & Kata Laluan diperlukan" }, { status: 400 });

            const { data: admin, error } = await supabase
                .from("stg_admins")
                .select("admin_id, password, fullname") 
                .eq("admin_id", admin_id)
                .single();

            if (error || !admin) return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });

            const valid = await bcrypt.compare(password, admin.password);
            if (!valid) return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });

            const session_id = await createSessionLog({
                user_id: String(admin.admin_id),
                user_name: admin.fullname ?? null,
                role: "admin",
            });

            const response = NextResponse.json({
                role: "admin",
                user_id: admin.admin_id,
                session_id,
            });
            setSessionCookie(response, {
                userType: "admin",
                role: "admin",
                user_id: String(admin.admin_id),
                session_id,
                name: admin.fullname ?? null,
            });
            return response;
        }

        // ================= TEACHER =================
        if (role === "teacher") {
            const { username, password } = body;
            const selectedTeacherRole = String(body?.selected_teacher_role ?? "")
                .toLowerCase()
                .trim();
            if (!username || !password) return NextResponse.json({ message: "ID & Kata Laluan diperlukan" }, { status: 400 });

            const { data: teacher, error } = await supabase
                .from("stg_teachers")
                .select("teacher_id, password, fullname, is_first_login")
                .eq("username", username)
                .single();

            if (error || !teacher) return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });

            const valid = await bcrypt.compare(password, teacher.password);
            if (!valid) return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });

            // Dapatkan Peranan (Role) Guru
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

            const normalizedRoleNames = roleNames
                .map((r) => String(r).toLowerCase().trim())
                .filter(Boolean);
            const effectiveRole =
                selectedTeacherRole && normalizedRoleNames.includes(selectedTeacherRole)
                    ? selectedTeacherRole
                    : normalizedRoleNames[0] ?? "teacher";

            const session_id = await createSessionLog({
                user_id: String(teacher.teacher_id),
                user_name: teacher.fullname ?? null,
                role: "teacher",
            });

            const response = NextResponse.json({
                role: effectiveRole,
                user_id: teacher.teacher_id,
                fullname: teacher.fullname,
                roles: roleNames,
                session_id,
                // First-login password change is disabled (teachers can proceed directly).
                must_change_password: false,
            });
            setSessionCookie(response, {
                userType: "teacher",
                role: effectiveRole,
                roles: roleNames,
                user_id: String(teacher.teacher_id),
                session_id,
                name: teacher.fullname ?? null,
            });
            return response;
        }

        return NextResponse.json({ message: "Peranan tidak sah" }, { status: 400 });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
