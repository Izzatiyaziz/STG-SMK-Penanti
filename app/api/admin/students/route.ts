import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ic_number, fullname, class_id } = body;

    // ❗ Student tak guna password
    if (!ic_number || !fullname) {
      return NextResponse.json(
        { message: "Required fields missing" },
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
        { message: "Student already exists or error occurred" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Student created successfully" });
  } catch (error) {
    console.error("ADD STUDENT SERVER ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
