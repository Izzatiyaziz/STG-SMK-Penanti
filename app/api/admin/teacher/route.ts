import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+?6?01)[0-9]-?\d{7,8}$/;

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const { username, fullname, email, phone_number, role_name, role_names } =
      await req.json();

    const roleNames = Array.isArray(role_names)
      ? role_names.map((role) => String(role).trim()).filter(Boolean)
      : role_name
        ? [String(role_name).trim()]
        : [];

    if (!username || !fullname || roleNames.length === 0) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    if (email && !EMAIL_REGEX.test(String(email).trim())) {
      return NextResponse.json(
        { message: "Format email tidak sah" },
        { status: 400 }
      );
    }

    if (phone_number && !PHONE_REGEX.test(String(phone_number).trim())) {
      return NextResponse.json(
        { message: "Format no. telefon tidak sah" },
        { status: 400 }
      );
    }

    const { data: roles, error: roleError } = await supabase
      .from("stg_roles")
      .select("role_id")
      .in("role_name", roleNames);

    if (roleError || !roles || roles.length !== roleNames.length) {
      return NextResponse.json(
        { message: "Role tidak sah" },
        { status: 400 }
      );
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const { data: teacher, error: teacherError } = await supabase
      .from("stg_teachers")
      .insert({
        username,
        password: hashedPassword,
        fullname: String(fullname).trim(),
        email: email?.trim() || null,
        phone_number: phone_number?.trim() || null,
      })
      .select("teacher_id")
      .single();

    if (teacherError) {
      return NextResponse.json(
        { message: teacherError.message },
        { status: 400 }
      );
    }

    const { error: assignError } = await supabase
      .from("stg_teacher_roles")
      .insert(
        roles.map((role) => ({
          teacher_id: teacher.teacher_id,
          role_id: role.role_id,
        }))
      );

    if (assignError) {
      return NextResponse.json(
        { message: assignError.message },
        { status: 400 }
      );
    }

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
      message: "Guru berjaya ditambah",
    });
  } catch (err) {
    console.error("ERROR:", err);

    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}
