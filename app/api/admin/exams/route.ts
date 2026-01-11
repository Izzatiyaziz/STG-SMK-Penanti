import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

// ================= GET EXAMS =================
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("stg_exams")
      .select("exam_id, exam_name, academic_year");

    if (error) {
      console.error("EXAM FETCH ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const exams = (data ?? []).map((e) => ({
      id: e.exam_id,
      name: e.exam_name,
      academic_year: e.academic_year,
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
    const body = await req.json();
    const { exam_name, academic_year } = body;

    if (!exam_name || !academic_year) {
      return NextResponse.json(
        { message: "Exam name and academic year are required" },
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
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// ================= UPDATE EXAM =================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { exam_id, exam_name, academic_year } = body;

    if (!exam_id || !exam_name || !academic_year) {
      return NextResponse.json(
        { message: "Exam ID, name and academic year are required" },
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
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// ================= DELETE EXAM =================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const exam_id = searchParams.get("id");

    if (!exam_id) {
      return NextResponse.json(
        { message: "Exam ID is required" },
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
      { message: "Server error" },
      { status: 500 }
    );
  }
}
