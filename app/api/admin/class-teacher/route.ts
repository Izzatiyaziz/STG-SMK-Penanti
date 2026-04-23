import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

/* =========================
   GET: LIST CLASS TEACHER ASSIGNMENTS
   /api/admin/class-teacher
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const class_id = searchParams.get("class_id");

    // ✅ if request for one class only
    if (class_id) {
      const { data, error } = await supabase
        .from("stg_class_teachers")
        .select("class_teacher_id, class_id, teacher_id, created_at")
        .eq("class_id", class_id)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data ?? null, { status: 200 });
    }

    // ✅ else return all assignments
    const { data, error } = await supabase
      .from("stg_class_teachers")
      .select("class_teacher_id, class_id, teacher_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error("GET class-teacher FAILED:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   POST: UPSERT CLASS TEACHER
   /api/admin/class-teacher

   body:
   {
     class_id: uuid,
     teacher_id: uuid
   }

   ✅ Logic:
   - If class already has teacher -> update teacher_id
   - Else insert new row
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const class_id = body?.class_id;
    const teacher_id = body?.teacher_id;

    if (!class_id || !teacher_id) {
      return NextResponse.json(
        { error: "class_id dan teacher_id diperlukan" },
        { status: 400 }
      );
    }

    // ✅ Enforce: one teacher can only be class teacher for ONE class
    const { data: teacherConflicts, error: conflictErr } = await supabase
      .from("stg_class_teachers")
      .select("class_id, teacher_id")
      .eq("teacher_id", teacher_id)
      .neq("class_id", class_id)
      .limit(1);

    if (conflictErr) {
      return NextResponse.json({ error: conflictErr.message }, { status: 500 });
    }

    if (Array.isArray(teacherConflicts) && teacherConflicts.length > 0) {
      return NextResponse.json(
        {
          error: "Guru ini sudah dilantik sebagai guru kelas untuk kelas lain.",
          conflict: teacherConflicts[0],
        },
        { status: 409 }
      );
    }

    // ✅ Check existing row for class
    const { data: existingRow, error: existingErr } = await supabase
      .from("stg_class_teachers")
      .select("class_teacher_id, class_id, teacher_id")
      .eq("class_id", class_id)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    // ✅ If exists -> UPDATE
    if (existingRow) {
      const { data: updatedRow, error: updateErr } = await supabase
        .from("stg_class_teachers")
        .update({ teacher_id })
        .eq("class_id", class_id)
        .select("class_teacher_id, class_id, teacher_id, created_at")
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          success: true,
          message: "Guru kelas berjaya dikemaskini ✅",
          assignment: updatedRow,
        },
        { status: 200 }
      );
    }

    // ✅ Else -> INSERT
    const { data: insertedRow, error: insertErr } = await supabase
      .from("stg_class_teachers")
      .insert({ class_id, teacher_id })
      .select("class_teacher_id, class_id, teacher_id, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Guru kelas berjaya dilantik ✅",
        assignment: insertedRow,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST class-teacher FAILED:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   DELETE: REMOVE CLASS TEACHER
   /api/admin/class-teacher?class_id=...
========================= */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const class_id = searchParams.get("class_id");

    if (!class_id) {
      return NextResponse.json(
        { error: "class_id diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_class_teachers")
      .delete()
      .eq("class_id", class_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "Guru kelas berjaya dibuang ✅" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE class-teacher FAILED:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
