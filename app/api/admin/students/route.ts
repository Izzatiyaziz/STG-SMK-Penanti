import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

// GET - Fetch all students or single student
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // If ID is provided, get single student
    if (id) {
      const { data, error } = await supabase
        .from("stg_students")
        .select("*, stg_classes(name)")
        .eq("id", id)
        .single();

      if (error) throw error;

      return NextResponse.json({
        id: data.id,
        fullname: data.fullname,
        ic_number: data.ic_number,
        email: data.email,
        class_id: data.class_id,
        class_name: data.stg_classes?.name,
        created_at: data.created_at
      });
    }

    // Get all students
    const { data, error } = await supabase
      .from("stg_students")
      .select("*, stg_classes(name)")
      .order("fullname", { ascending: true });

    if (error) throw error;

    const formattedStudents = data.map((student: any) => ({
      id: student.id,
      name: student.fullname,
      identifier: student.ic_number,
      email: student.email || "",
      class_id: student.class_id,
      className: student.stg_classes?.name,
      status: "active",
      created_at: student.created_at
    }));

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error("GET STUDENTS ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// POST - Create new student
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ic_number, fullname, class_id } = body;

    if (!ic_number || !fullname) {
      return NextResponse.json(
        { message: "IC number dan nama penuh diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("stg_students").insert({
      ic_number,
      fullname,
      class_id,
    });

    if (error) {
      console.error("ADD STUDENT ERROR:", error);
      return NextResponse.json(
        { message: "Pelajar sudah wujud atau ralat berlaku" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: "Pelajar berjaya dicipta" 
    });
  } catch (error) {
    console.error("ADD STUDENT SERVER ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// PUT - Update student
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID Pelajar diperlukan" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { fullname, ic_number, class_id, email } = body;

    if (!fullname || !ic_number) {
      return NextResponse.json(
        { message: "Nama dan IC number diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_students")
      .update({
        fullname,
        ic_number,
        class_id: class_id || null,
        email: email || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("UPDATE STUDENT ERROR:", error);
      return NextResponse.json(
        { message: "Gagal mengemas kini pelajar" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: "Pelajar berjaya dikemas kini" 
    });
  } catch (error) {
    console.error("UPDATE STUDENT SERVER ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete student
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID Pelajar diperlukan" },
        { status: 400 }
      );
    }

    // First, check if student exists
    const { data: student, error: fetchError } = await supabase
      .from("stg_students")
      .select("id, fullname")
      .eq("id", id)
      .single();

    if (fetchError || !student) {
      return NextResponse.json(
        { message: "Pelajar tidak dijumpai" },
        { status: 404 }
      );
    }

    // Delete the student
    const { error } = await supabase
      .from("stg_students")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE STUDENT ERROR:", error);
      return NextResponse.json(
        { message: "Gagal memadam pelajar" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: "Pelajar berjaya dipadam" 
    });
  } catch (error) {
    console.error("DELETE STUDENT SERVER ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}