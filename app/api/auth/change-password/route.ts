import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import { requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

type UserType = "admin" | "teacher" | "student";

export async function POST(req: Request) {
    try {
        const guard = await requireApiSession();
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const userType = String(body?.userType ?? "").trim() as UserType;
        const user_id = String(body?.user_id ?? "").trim();
        const current_password = String(body?.current_password ?? "");
        const new_password = String(body?.new_password ?? "");
        const first_login = Boolean(body?.first_login);

        if (!userType || !user_id) {
            return NextResponse.json(
                { message: "userType dan user_id diperlukan" },
                { status: 400 }
            );
        }

        if (
            guard.session.userType !== userType ||
            String(guard.session.user_id) !== user_id
        ) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        if (!new_password) {
            return NextResponse.json(
                { message: "Kata laluan baharu diperlukan" },
                { status: 400 }
            );
        }

        if (new_password.length < 8) {
            return NextResponse.json(
                { message: "Kata laluan baharu mesti sekurang-kurangnya 8 aksara" },
                { status: 400 }
            );
        }

        const hashed = await bcrypt.hash(new_password, 10);

        // ================= TEACHER =================
        if (userType === "teacher") {
            const { data: teacher, error } = await supabase
                .from("stg_teachers")
                .select("teacher_id, password, is_first_login")
                .eq("teacher_id", user_id)
                .single();

            if (error || !teacher) {
                return NextResponse.json(
                    { message: "User not found" },
                    { status: 404 }
                );
            }

            if (!first_login) {
                if (!current_password) {
                    return NextResponse.json(
                        { message: "Kata laluan semasa diperlukan" },
                        { status: 400 }
                    );
                }

                const valid = await bcrypt.compare(
                    current_password,
                    teacher.password
                );
                if (!valid) {
                    return NextResponse.json(
                        { message: "Kata laluan semasa tidak sah" },
                        { status: 401 }
                    );
                }
            } else if (!teacher.is_first_login) {
                return NextResponse.json(
                    { message: "Akaun ini tidak memerlukan penukaran kata laluan pertama" },
                    { status: 400 }
                );
            }

            const { error: updateErr } = await supabase
                .from("stg_teachers")
                .update({ password: hashed, is_first_login: false })
                .eq("teacher_id", teacher.teacher_id);

            if (updateErr) {
                return NextResponse.json(
                    { message: updateErr.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true });
        }

        // ================= ADMIN =================
        if (userType === "admin") {
            const { data: admin, error } = await supabase
                .from("stg_admins")
                .select("admin_id, password")
                .eq("admin_id", user_id)
                .single();

            if (error || !admin) {
                return NextResponse.json(
                    { message: "User not found" },
                    { status: 404 }
                );
            }

            const valid = await bcrypt.compare(current_password, admin.password);
            if (!valid) {
                return NextResponse.json(
                    { message: "Kata laluan semasa tidak sah" },
                    { status: 401 }
                );
            }

            const { error: updateErr } = await supabase
                .from("stg_admins")
                .update({ password: hashed })
                .eq("admin_id", admin.admin_id);

            if (updateErr) {
                return NextResponse.json(
                    { message: updateErr.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true });
        }

        // ================= STUDENT (optional) =================
        if (userType === "student") {
            const { data: student, error } = await supabase
                .from("stg_students")
                .select("student_id, password")
                .eq("student_id", user_id)
                .single();

            if (error || !student) {
                return NextResponse.json(
                    { message: "User not found" },
                    { status: 404 }
                );
            }

            const existing = student.password ?? "";
            if (!existing) {
                return NextResponse.json(
                    { message: "Akaun pelajar tiada kata laluan untuk ditukar" },
                    { status: 400 }
                );
            }

            const valid = await bcrypt.compare(current_password, existing);
            if (!valid) {
                return NextResponse.json(
                    { message: "Kata laluan semasa tidak sah" },
                    { status: 401 }
                );
            }

            const { error: updateErr } = await supabase
                .from("stg_students")
                .update({ password: hashed })
                .eq("student_id", student.student_id);

            if (updateErr) {
                return NextResponse.json(
                    { message: updateErr.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ message: "Invalid userType" }, { status: 400 });
    } catch (err) {
        console.error("CHANGE PASSWORD ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
