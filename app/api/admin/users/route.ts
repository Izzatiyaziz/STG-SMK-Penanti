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

      if (error || !data) {
        console.error("ADMIN FETCH ERROR:", error);
        return NextResponse.json([], { status: 200 });
      }

      return NextResponse.json(
        data.map((a: any) => ({
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
        .select("teacher_id, fullname");

      if (error || !data) {
        console.error("TEACHER FETCH ERROR:", error);
        return NextResponse.json([], { status: 200 });
      }

      return NextResponse.json(
        data.map((t: any) => ({
          id: t.teacher_id,
          name: t.fullname,
          identifier: t.teacher_id,
          role: "teacher",
        }))
      );
    }

    // ================= STUDENT =================
    if (role === "student") {
      const { data, error } = await supabase
        .from("stg_students")
        .select(`
          student_id,
          fullname,
          ic_number,
          class:stg_classes (
            class_id,
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
          status: "active",
          className: s.class?.class_name ?? null,
        }))
      );
    }

    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.error("FETCH USERS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}
