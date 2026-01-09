import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const {
            username,
            password,
            fullname,
            email,
            phone_number,
            role_name, // 🔥 role name (e.g. "subject teacher")
        } = await req.json();

        if (!username || !password || !fullname || !role_name) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        // 🔐 hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1️⃣ create teacher
        const { data: teacher, error: teacherError } = await supabase
            .from("stg_teachers")
            .insert({
                username,
                password: hashedPassword,
                fullname,
                email,
                phone_number,
            })
            .select()
            .single();

        if (teacherError) {
            return NextResponse.json(
                { message: teacherError.message },
                { status: 400 }
            );
        }

        // 2️⃣ get role_id
        const { data: role } = await supabase
            .from("stg_roles")
            .select("role_id")
            .eq("role_name", role_name)
            .single();

        if (!role) {
            return NextResponse.json(
                { message: "Invalid role" },
                { status: 400 }
            );
        }

        // 3️⃣ assign role
        await supabase.from("stg_teacher_roles").insert({
            teacher_id: teacher.teacher_id,
            role_id: role.role_id,
        });

        return NextResponse.json({
            message: "Teacher added successfully",
        });
    } catch (err) {
        console.error("ADD TEACHER ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
