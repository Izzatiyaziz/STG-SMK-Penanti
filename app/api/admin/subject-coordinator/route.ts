import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

/* =========================
   GET: LIST SUBJECT COORDINATORS
   /api/admin/subject-coordinator
========================= */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("stg_subject_coordinators")
      .select(
        `
        subject_coordinator_id,
        subject_id,
        teacher_id,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   POST: UPSERT SUBJECT COORDINATOR
   /api/admin/subject-coordinator

   body:
   {
     subject_id: uuid,
     teacher_id: uuid
   }

   ✅ Logic:
   - If subject already has coordinator -> update teacher_id
   - Else insert new row
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const subject_id = body?.subject_id;
    const teacher_id = body?.teacher_id;

    if (!subject_id || !teacher_id) {
      return NextResponse.json(
        { error: "subject_id dan teacher_id diperlukan" },
        { status: 400 }
      );
    }
    

    // ✅ Check existing coordinator for this subject
    const { data: existingRow, error: existingErr } = await supabase
      .from("stg_subject_coordinators")
      .select("subject_coordinator_id, subject_id, teacher_id")
      .eq("subject_id", subject_id)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json(
        { error: existingErr.message },
        { status: 500 }
      );
    }

    // ✅ If exists -> update
    if (existingRow) {
      const { data: updatedRow, error: updateErr } = await supabase
        .from("stg_subject_coordinators")
        .update({ teacher_id })
        .eq("subject_id", subject_id)
        .select("subject_coordinator_id, subject_id, teacher_id, created_at")
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          success: true,
          message: "Penyelaras subjek berjaya dikemaskini ✅",
          coordinator: updatedRow,
        },
        { status: 200 }
      );
    }

    // ✅ Else insert new
    const { data: insertedRow, error: insertErr } = await supabase
      .from("stg_subject_coordinators")
      .insert({ subject_id, teacher_id })
      .select("subject_coordinator_id, subject_id, teacher_id, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Penyelaras subjek berjaya dilantik ✅",
        coordinator: insertedRow,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST subject-coordinator FAILED:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  
}

/* =========================
   DELETE: REMOVE SUBJECT COORDINATOR
   /api/admin/subject-coordinator?subject_id=...
========================= */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject_id = searchParams.get("subject_id");

    if (!subject_id) {
      return NextResponse.json(
        { error: "subject_id diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_subject_coordinators")
      .delete()
      .eq("subject_id", subject_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "Coordinator berjaya dipadam ✅" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
