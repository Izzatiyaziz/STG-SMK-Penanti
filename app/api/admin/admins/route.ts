import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    return "Ralat SMTP tidak dikenal pasti. Sila semak Runtime Logs Vercel untuk butiran SEND ADMIN WELCOME EMAIL ERROR.";
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

async function sendAdminWelcomeEmail(params: {
    to: string;
    fullname: string;
    adminId: string;
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
    const adminId = escapeHtml(params.adminId);
    const temporaryPassword = escapeHtml(params.temporaryPassword);

    await transporter.sendMail({
        from: emailUser,
        to: params.to,
        subject: "Akaun Admin Baru - Sistem STG SMK Penanti",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Akaun Admin Baru</h2>
                <p>Salam sejahtera ${fullname},</p>
                <p>Akaun admin anda telah didaftarkan dalam Sistem STG SMK Penanti.</p>
                <div style="background:#f4f4f4; padding:14px; border-radius:8px; display:inline-block;">
                    <p style="margin:0 0 8px;"><strong>ID Admin:</strong> ${adminId}</p>
                    <p style="margin:0;"><strong>Kata laluan sementara:</strong> ${temporaryPassword}</p>
                </div>
                <p>Sila log masuk menggunakan kata laluan sementara ini. Anda perlu menukar kata laluan semasa log masuk pertama.</p>
            </div>
        `,
    });
}

function normalizeAdminId(value: unknown) {
    return String(value ?? "").trim();
}

function getNextAdminId(rows: Array<{ admin_id?: string | null }>) {
    const nextNumber =
        rows.reduce((highest, row) => {
            const match = /^ADM(\d+)$/i.exec(row.admin_id ?? "");
            if (!match) return highest;
            return Math.max(highest, Number(match[1]));
        }, 1) + 1;

    return `ADM${String(nextNumber).padStart(3, "0")}`;
}

async function generateNextAdminId() {
    const { data, error } = await supabaseAdmin
        .from("stg_admins")
        .select("admin_id");

    if (error) throw error;
    return getNextAdminId(data ?? []);
}

export async function GET() {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { data, error } = await supabaseAdmin
            .from("stg_admins")
            .select("admin_id, username, fullname, email, status, created_at, is_first_login")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ message: error.message, data: [] }, { status: 500 });
        }

        return NextResponse.json({ data: data ?? [] });
    } catch (error) {
        console.error("ADMIN LIST ERROR:", error);
        return NextResponse.json({ message: "Ralat pelayan", data: [] }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const fullname = String(body?.fullname ?? "").replace(/\s+/g, " ").trim().toUpperCase();
        const email = String(body?.email ?? "").trim();

        if (!fullname || !email) {
            return NextResponse.json(
                { message: "Nama penuh dan e-mel diperlukan" },
                { status: 400 }
            );
        }

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json({ message: "Format e-mel tidak sah" }, { status: 400 });
        }

        const adminId = await generateNextAdminId();
        const temporaryPassword = generateTemporaryPassword();
        const password = await bcrypt.hash(temporaryPassword, 10);

        const { error } = await supabaseAdmin.from("stg_admins").insert({
            admin_id: adminId,
            username: adminId,
            password,
            fullname,
            email,
            status: "active",
            is_first_login: true,
        });

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }

        try {
            await sendAdminWelcomeEmail({
                to: email,
                fullname,
                adminId,
                temporaryPassword,
            });
        } catch (emailError) {
            console.error("SEND ADMIN WELCOME EMAIL ERROR:", {
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
            await supabaseAdmin.from("stg_admins").delete().eq("admin_id", adminId);

            return NextResponse.json(
                {
                    message: `Akaun admin tidak dibuat kerana e-mel kata laluan sementara gagal dihantar. ${getEmailErrorMessage(emailError)}`,
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            message: `Admin berjaya ditambah. ID Admin ${adminId} dan kata laluan sementara telah dihantar melalui e-mel.`,
        });
    } catch (error) {
        console.error("ADMIN CREATE ERROR:", error);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const adminId = normalizeAdminId(body?.admin_id);
        const status = String(body?.status ?? "").trim();
        const fullname = String(body?.fullname ?? "").replace(/\s+/g, " ").trim().toUpperCase();
        const email = String(body?.email ?? "").trim();

        if (!adminId) {
            return NextResponse.json({ message: "ID Admin diperlukan" }, { status: 400 });
        }

        const updates: Record<string, string> = {};

        if (fullname) updates.fullname = fullname;
        if (email) {
            if (!EMAIL_REGEX.test(email)) {
                return NextResponse.json({ message: "Format e-mel tidak sah" }, { status: 400 });
            }
            updates.email = email;
        }

        if (status) {
            if (!["active", "inactive"].includes(status)) {
                return NextResponse.json({ message: "Status admin tidak sah" }, { status: 400 });
            }

            if (status === "inactive" && adminId === guard.session.user_id) {
                return NextResponse.json(
                    { message: "Anda tidak boleh nyahaktifkan akaun sendiri" },
                    { status: 400 }
                );
            }

            if (status === "inactive") {
                const { count, error: countError } = await supabaseAdmin
                    .from("stg_admins")
                    .select("admin_id", { count: "exact", head: true })
                    .eq("status", "active")
                    .neq("admin_id", adminId);

                if (countError) {
                    return NextResponse.json({ message: countError.message }, { status: 500 });
                }

                if (!count || count < 1) {
                    return NextResponse.json(
                        { message: "Sekurang-kurangnya satu akaun admin aktif diperlukan" },
                        { status: 400 }
                    );
                }
            }

            updates.status = status;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ message: "Tiada perubahan untuk disimpan" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("stg_admins")
            .update(updates)
            .eq("admin_id", adminId);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: "Maklumat admin berjaya dikemas kini" });
    } catch (error) {
        console.error("ADMIN UPDATE ERROR:", error);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const adminId = normalizeAdminId(searchParams.get("admin_id"));

        if (!adminId) {
            return NextResponse.json({ message: "ID Admin diperlukan" }, { status: 400 });
        }

        if (adminId === guard.session.user_id) {
            return NextResponse.json(
                { message: "Anda tidak boleh padam akaun sendiri" },
                { status: 400 }
            );
        }

        const { data: admin, error: adminError } = await supabaseAdmin
            .from("stg_admins")
            .select("admin_id, status")
            .eq("admin_id", adminId)
            .single();

        if (adminError || !admin) {
            return NextResponse.json({ message: "Admin tidak dijumpai" }, { status: 404 });
        }

        if (admin.status !== "inactive") {
            const { count, error: countError } = await supabaseAdmin
                .from("stg_admins")
                .select("admin_id", { count: "exact", head: true })
                .eq("status", "active")
                .neq("admin_id", adminId);

            if (countError) {
                return NextResponse.json({ message: countError.message }, { status: 500 });
            }

            if (!count || count < 1) {
                return NextResponse.json(
                    { message: "Sekurang-kurangnya satu akaun admin aktif diperlukan" },
                    { status: 400 }
                );
            }
        }

        const { error } = await supabaseAdmin
            .from("stg_admins")
            .delete()
            .eq("admin_id", adminId);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: "Admin berjaya dipadam" });
    } catch (error) {
        console.error("ADMIN DELETE ERROR:", error);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
