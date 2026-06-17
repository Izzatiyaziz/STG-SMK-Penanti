import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

function getEmailErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const responseCode =
    error && typeof error === "object" && "responseCode" in error
      ? String(error.responseCode)
      : "";

  if (/Konfigurasi e-mel belum lengkap/i.test(message)) {
    return "Konfigurasi EMAIL_USER atau EMAIL_PASS belum lengkap di Vercel Production.";
  }

  if (code === "EAUTH" || responseCode === "535" || /Invalid login|Username and Password not accepted/i.test(message)) {
    return "Gmail menolak EMAIL_USER atau EMAIL_PASS. Pastikan EMAIL_PASS ialah Gmail App Password 16 aksara, bukan password Gmail biasa.";
  }

  if (code === "ETIMEDOUT" || code === "ESOCKET" || /timeout|network|socket/i.test(message)) {
    return "Sambungan SMTP dari Vercel gagal. Cuba semula atau semak tetapan rangkaian/SMTP.";
  }

  return "Ralat SMTP tidak dikenal pasti. Sila semak Runtime Logs Vercel untuk butiran SEND NEW TEACHER EMAIL ERROR.";
}

function generateTemporaryPassword() {
  return `Temp-${randomBytes(5).toString("hex").toUpperCase()}!`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendNewTeacherEmail(params: {
  to: string;
  fullname: string;
  staffId: string;
  temporaryPassword: string;
}) {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

  if (!emailUser || !emailPass) {
    throw new Error("Konfigurasi e-mel belum lengkap");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const fullname = escapeHtml(params.fullname);
  const staffId = escapeHtml(params.staffId);
  const temporaryPassword = escapeHtml(params.temporaryPassword);

  await transporter.sendMail({
    from: emailUser,
    to: params.to,
    subject: "Akaun Guru Baru - Sistem STG SMK Penanti",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Akaun Guru Baru</h2>
        <p>Salam sejahtera ${fullname},</p>
        <p>Akaun anda telah didaftarkan dalam Sistem STG SMK Penanti.</p>
        <p>Sila log masuk menggunakan maklumat berikut:</p>
        <div style="background:#f4f4f4; padding:14px; border-radius:8px; display:inline-block;">
          <p style="margin:0 0 8px;"><strong>Staff ID:</strong> ${staffId}</p>
          <p style="margin:0;"><strong>Kata laluan sementara:</strong> ${temporaryPassword}</p>
        </div>
        <p>Selepas log masuk kali pertama, anda perlu menukar kata laluan sementara ini kepada kata laluan baharu.</p>
      </div>
    `,
  });
}

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const { username, fullname, email, role_name, role_names } =
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

    const normalizedEmail = String(email ?? "").trim();

    if (!normalizedEmail) {
      return NextResponse.json(
        { message: "E-mel guru diperlukan untuk menghantar kata laluan sementara" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "Format e-mel tidak sah" },
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

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const { data: teacher, error: teacherError } = await supabase
      .from("stg_teachers")
      .insert({
        username,
        password: hashedPassword,
        fullname: String(fullname).trim(),
        email: normalizedEmail,
        status: "active",
        is_first_login: true,
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
      await supabase.from("stg_teacher_roles").delete().eq("teacher_id", teacher.teacher_id);
      await supabase.from("stg_teachers").delete().eq("teacher_id", teacher.teacher_id);

      return NextResponse.json(
        { message: assignError.message },
        { status: 400 }
      );
    }

    try {
      await sendNewTeacherEmail({
        to: normalizedEmail,
        fullname: String(fullname).trim(),
        staffId: String(username).trim(),
        temporaryPassword,
      });
    } catch (emailError) {
      console.error("SEND NEW TEACHER EMAIL ERROR:", {
        message: emailError instanceof Error ? emailError.message : String(emailError),
        code:
          emailError && typeof emailError === "object" && "code" in emailError
            ? String(emailError.code)
            : undefined,
        responseCode:
          emailError && typeof emailError === "object" && "responseCode" in emailError
            ? String(emailError.responseCode)
            : undefined,
        command:
          emailError && typeof emailError === "object" && "command" in emailError
            ? String(emailError.command)
            : undefined,
      });
      await supabase.from("stg_teacher_roles").delete().eq("teacher_id", teacher.teacher_id);
      await supabase.from("stg_teachers").delete().eq("teacher_id", teacher.teacher_id);

      return NextResponse.json(
        {
          message: `Akaun guru tidak dibuat kerana e-mel kata laluan sementara gagal dihantar. ${getEmailErrorMessage(emailError)}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Guru berjaya ditambah. Staff ID dan kata laluan sementara telah dihantar melalui e-mel.",
    });
  } catch (err) {
    console.error("ERROR:", err);

    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}
