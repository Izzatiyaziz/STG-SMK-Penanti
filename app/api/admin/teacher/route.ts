import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import bcrypt from "bcryptjs";

/* ================= GET: ROLES ================= */
export async function GET() {
  const { data, error } = await supabase
    .from("stg_roles")
    .select("role_id, role_name")
    .order("role_id");

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data);
}

/* ================= POST: ADD TEACHER ================= */
export async function POST(req: Request) {
  try {
    const {
      username,
      password,
      fullname,
      email,
      phone_number,
      role_name,
    } = await req.json();

    if (!username || !password || !fullname || !role_name) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1️⃣ insert teacher
    const { data: teacher, error: teacherError } = await supabase
      .from("stg_teachers")
      .insert({
        username,
        password: hashedPassword,
        fullname,
        email,
        phone_number,
      })
      .select("teacher_id")
      .single();

    if (teacherError) {
      return NextResponse.json(
        { message: teacherError.message },
        { status: 400 }
      );
    }

    // 2️⃣ get role_id
    const { data: role, error: roleError } = await supabase
      .from("stg_roles")
      .select("role_id")
      .eq("role_name", role_name)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { message: "Invalid role" },
        { status: 400 }
      );
    }

    // 3️⃣ assign role
    const { error: assignError } = await supabase
      .from("stg_teacher_roles")
      .insert({
        teacher_id: teacher.teacher_id,
        role_id: role.role_id,
      });

    if (assignError) {
      return NextResponse.json(
        { message: assignError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Teacher added successfully" });
  } catch (err) {
    console.error("ADD TEACHER ERROR:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
