import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
const { username, fullname, email, class_id, password } = body;

    if (!fullname || !password) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("stg_students").insert({
  username,
  fullname,
  email,
  class_id,
  password: hashedPassword,
  status: "active",
});

    if (error) {
      console.error("ADD STUDENT ERROR:", error);
      return NextResponse.json(
        { message: "Failed to add student" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Student added successfully" });
  } catch (error) {
    console.error("POST STUDENT ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
