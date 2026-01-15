import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const teacherId = params?.id;

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacher_id tidak dijumpai dalam URL params" },
        { status: 400 }
      );
    }

    // ✅ Get teacher info
    const { data: teacher, error: teacherErr } = await supabase
      .from("stg_teachers")
      .select("teacher_id, username, fullname, email, phone_number, status")
      .eq("teacher_id", teacherId)
      .single();

    if (teacherErr || !teacher) {
      return NextResponse.json(
        { error: teacherErr?.message || "Teacher tidak dijumpai" },
        { status: 404 }
      );
    }

    // ✅ Get role(s)
    const { data: rolesData, error: roleErr } = await supabase
      .from("stg_teacher_roles")
      .select(
        `
        role_id,
        stg_roles (
          role_name
        )
      `
      )
      .eq("teacher_id", teacherId);

    if (roleErr) {
      return NextResponse.json(
        { error: roleErr.message },
        { status: 500 }
      );
    }

    const roles =
      rolesData?.map((r: any) => r?.stg_roles?.role_name).filter(Boolean) ?? [];

    return NextResponse.json(
      {
        id: teacher.teacher_id,
        teacher_id: teacher.teacher_id,
        username: teacher.username,
        fullname: teacher.fullname,
        email: teacher.email,
        phone_number: teacher.phone_number,
        status: teacher.status,
        roles,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET TEACHER [id] ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
