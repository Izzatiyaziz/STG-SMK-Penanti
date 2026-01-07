import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("stg_subjects")
      .select("subject_id, subject_name");

    if (error) {
      console.error("SUBJECT FETCH ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const subjects = (data ?? []).map((s) => ({
      id: s.subject_id,
      name: s.subject_name,
    }));

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("FETCH SUBJECTS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject_name } = body;

    if (!subject_name) {
      return NextResponse.json(
        { message: "Subject name is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_subjects")
      .insert({ subject_name });

    if (error) {
      console.error("ADD SUBJECT ERROR:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Subject already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Subject added successfully" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { subject_id, subject_name } = body;

    if (!subject_id || !subject_name) {
      return NextResponse.json(
        { message: "Subject ID and name are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_subjects")
      .update({ subject_name })
      .eq("subject_id", subject_id);

    if (error) {
      console.error("UPDATE SUBJECT ERROR:", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Subject updated successfully" });
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject_id = searchParams.get("id");

    if (!subject_id) {
      return NextResponse.json(
        { message: "Subject ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_subjects")
      .delete()
      .eq("subject_id", subject_id);

    if (error) {
      console.error("DELETE SUBJECT ERROR:", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Subject deleted successfully" });
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}