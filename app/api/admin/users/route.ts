import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    // ================= ADMIN =================
    if (role === "admin") {
      const { data, error } = await supabase
        .from("stg_admins")
        .select("admin_id");

      if (error) return NextResponse.json([], { status: 200 });

      return NextResponse.json(
        data.map((a) => ({
          id: a.admin_id,
          name: "Admin",
          identifier: a.admin_id,
          role: "admin",
        }))
      );
    }

    // ================= TEACHER =================
    if (role === "teacher") {
      const { data, error } = await supabase
        .from("stg_teachers")
        .select("teacher_id, fullname, username");

      if (error) return NextResponse.json([], { status: 200 });

      return NextResponse.json(
        data.map((t) => ({
          id: t.teacher_id,
          name: t.fullname,
          identifier: t.username,
          role: "teacher",
        }))
      );
    }

    // ================= STUDENT =================
    if (role === "student") {
      const { data, error } = await supabase
        .from("stg_students")
        .select("student_id, fullname, username");

      if (error) return NextResponse.json([], { status: 200 });

      return NextResponse.json(
        data.map((s) => ({
          id: s.student_id,       // IC number
          name: s.fullname,
          identifier: s.username,
          role: "student",
        }))
      );
    }

    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.error("FETCH USERS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}
