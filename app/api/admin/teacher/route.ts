import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const {
      username,
      fullname,
      email,
      phone_number,
      role_name,
    } = await req.json();

    if (!username || !fullname || !role_name) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // 1️⃣ CHECK ROLE
    const { data: role, error: roleError } = await supabase
      .from("stg_roles")
      .select("role_id")
      .eq("role_name", role_name)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { message: "Role tidak sah" },
        { status: 400 }
      );
    }

    // GENERATE TEMP PASSWORD
    const tempPassword = Math.random().toString(36).slice(-8);

    // 2️⃣ HASH PASSWORD
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3️⃣ INSERT TEACHER
    const { data: teacher, error: teacherError } = await supabase
      .from("stg_teachers")
      .insert({
        username,
        password: hashedPassword,
        fullname,
        email,
        phone_number,
      })
      .select("teacher_id")
      .single();

    if (teacherError) {
      return NextResponse.json(
        { message: teacherError.message },
        { status: 400 }
      );
    }

    // 4️⃣ ASSIGN ROLE
    const { error: assignError } = await supabase
      .from("stg_teacher_roles")
      .insert({
        teacher_id: teacher.teacher_id,
        role_id: role.role_id,
      });

    if (assignError) {
      return NextResponse.json(
        { message: assignError.message },
        { status: 400 }
      );
    }

    // 5️⃣ SEND EMAIL
    if (email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"STG System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Akaun Sistem STG",
        html: `
          <h3>Maklumat Akaun Anda</h3>
          <p><b>Username:</b> ${username}</p>
          <p><b>Password sementara:</b> ${tempPassword}</p>
          <br/>
          <p>Sila login dan tukar password anda selepas login pertama.</p>
        `,
      });
    }

    return NextResponse.json({
      message: "Guru berjaya ditambah & email dihantar",
    });

  } catch (err) {
    console.error("ERROR:", err);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
