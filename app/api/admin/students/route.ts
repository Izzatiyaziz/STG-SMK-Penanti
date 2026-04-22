import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data: student, error } = await supabase
        .from("stg_students")
        .select("*")
        .or(`id.eq.${id},student_id.eq.${id}`)
        .single();

      if (error || !student) {
        return NextResponse.json({ success: false, message: "Pelajar tidak dijumpai" }, { status: 404 });
      }
      return NextResponse.json(student);
    }

    const { data: students, error: fetchError } = await supabase
      .from("stg_students")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ic_number, fullname, class_id, enrollment_date, level } = body;
    
    if (!ic_number || !fullname || !level) {
      return NextResponse.json({ success: false, message: "Nama, IC, dan Tingkatan wajib diisi." }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("stg_students")
      .insert([{
        ic_number,
        fullname,
        level: String(level), 
        enrollment_date: enrollment_date || new Date().toISOString().split('T')[0],
        class_id: class_id || null, 
        status: "active",
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ success: false, message: "Gagal simpan ke database", error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID diperlukan" }, { status: 400 });

    const body = await req.json();
    const { name, identifier, level, enrollment_date, className } = body;

    // Cari class_id berdasarkan nama kelas jika perlu
    let class_id = null;
    if (className && className !== "none") {
        const { data: classData } = await supabase.from("stg_classes").select("id").eq("name", className).single();
        if (classData) class_id = classData.id;
    }

    const { error: updateError } = await supabase
      .from("stg_students")
      .update({
        fullname: name,
        ic_number: identifier,
        level: level,
        enrollment_date: enrollment_date,
        class_id: class_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) throw updateError;
    return NextResponse.json({ success: true, message: "Berjaya dikemaskini" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID diperlukan" }, { status: 400 });

    const { error } = await supabase.from("stg_students").delete().eq("id", id);
    if (error) {
        return NextResponse.json({ 
            success: false, 
            message: "Gagal padam. Mungkin pelajar mempunyai data markah/kehadiran.",
            error: error.message 
        }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Dipadam" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}