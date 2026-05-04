import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

// ================= GET EXAMS =================
export async function GET() {
  try {
    const guard = await requireApiRole(["admin", "teacher"]);
    if ("response" in guard) return guard.response;

    const { data, error } = await supabase
      .from("stg_exams")
      .select("*")
      .order("academic_year", { ascending: false })
      .order("exam_name", { ascending: true });

    if (error) {
      console.error("EXAM FETCH ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const exams = (data ?? []).map((e: any) => ({
      id: e.exam_id,
      name: e.exam_name,
      academic_year: e.academic_year,
      subject_settings: e.subject_settings ?? {},
    }));

    return NextResponse.json(exams);
  } catch (error) {
    console.error("FETCH EXAMS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ================= ADD EXAM =================
export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const { exam_name, academic_year } = body;

    if (!exam_name || !academic_year) {
      return NextResponse.json(
        { message: "Nama peperiksaan dan tahun akademik diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_exams")
      .insert({ exam_name, academic_year });

    if (error) {
      console.error("ADD EXAM ERROR:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Exam already exists for this academic year" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Exam added successfully" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}

// ================= UPDATE EXAM =================
export async function PUT(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const { exam_id, exam_name, academic_year, subject_settings } = body;

    if (!exam_id) {
      return NextResponse.json(
        { message: "Exam ID diperlukan" },
        { status: 400 }
      );
    }

    // Update settings only
    if (subject_settings !== undefined) {
      const { error } = await supabase
        .from("stg_exams")
        .update({ subject_settings })
        .eq("exam_id", exam_id);

      if (error) {
        console.error("UPDATE EXAM SETTINGS ERROR:", error);
        return NextResponse.json(
          {
            message:
              error.message ||
              "Gagal mengemas kini settings peperiksaan. Pastikan kolum `subject_settings` wujud di `stg_exams`.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Settings peperiksaan berjaya dikemas kini" });
    }

    if (!exam_name || !academic_year) {
      return NextResponse.json(
        { message: "Nama peperiksaan dan tahun akademik diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_exams")
      .update({ exam_name, academic_year })
      .eq("exam_id", exam_id);

    if (error) {
      console.error("UPDATE EXAM ERROR:", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Exam updated successfully" });
  } catch {
    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}

// ================= DELETE EXAM =================
export async function DELETE(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const exam_id = searchParams.get("id");

    if (!exam_id) {
      return NextResponse.json(
        { message: "ID peperiksaan diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_exams")
      .delete()
      .eq("exam_id", exam_id);

    if (error) {
      console.error("DELETE EXAM ERROR:", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch {
    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}
