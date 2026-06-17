import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabaseAdmin from "@/lib/supabase-admin";
import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import {
    consumeRateLimit,
    getClientIp,
    isRequestBodyTooLarge,
    normalizeLoginIdentifier,
    rateLimitKey,
} from "@/lib/security";
import { logSecurityEvent } from "@/lib/security-events";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function POST(req: Request) {
    try {
        if (isRequestBodyTooLarge(req, 8_192)) {
            return NextResponse.json(
                { message: "Permintaan terlalu besar" },
                { status: 413 }
            );
        }

        const body = await req.json();
        const role = normalizeLoginIdentifier(body?.role, 20).toLowerCase();
        const identifier = normalizeLoginIdentifier(body?.identifier);

        if (!["teacher", "admin"].includes(role) || !identifier) {
            return NextResponse.json(
                { message: "Peranan dan ID diperlukan" },
                { status: 400 }
            );
        }

        const clientIp = getClientIp(req);
        const ipLimit = consumeRateLimit(
            `forgot-password:ip:${rateLimitKey(clientIp)}`,
            { limit: 8, windowMs: 60 * 60 * 1000 }
        );
        const accountLimit = consumeRateLimit(
            `forgot-password:account:${rateLimitKey(`${role}:${identifier.toLowerCase()}`)}`,
            { limit: 3, windowMs: 60 * 60 * 1000 }
        );

        if (!ipLimit.allowed || !accountLimit.allowed) {
            await logSecurityEvent({
                eventType: "password_reset_abuse",
                severity: "high",
                ipAddress: clientIp,
                identifier,
                role,
                endpoint: "/api/auth/forgot-password",
                details: { reason: "Had permintaan set semula kata laluan dicapai" },
            });
            const retryAfterSeconds = Math.max(
                ipLimit.retryAfterSeconds,
                accountLimit.retryAfterSeconds
            );
            return NextResponse.json(
                { message: "Terlalu banyak permintaan. Sila cuba semula kemudian." },
                {
                    status: 429,
                    headers: { "Retry-After": String(retryAfterSeconds) },
                }
            );
        }

        const genericSuccessMessage =
            "Jika akaun dan e-mel berdaftar wujud, arahan set semula kata laluan akan dihantar.";

        const tempPassword = generateTemporaryPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        let userEmail = "";
        let userName = "";
        let accountIdentifier = identifier;

        // ================= GURU =================
        if (role === "teacher") {
            const teacherQuery = supabaseAdmin
                .from("stg_teachers")
                .select("teacher_id, username, email, fullname");
            const { data: teacher, error: fetchErr } = EMAIL_REGEX.test(identifier)
                ? await teacherQuery.eq("email", identifier).maybeSingle()
                : await teacherQuery.eq("username", identifier).maybeSingle();

            if (fetchErr || !teacher) {
                return NextResponse.json({ message: genericSuccessMessage });
            }

            userEmail = String(teacher.email ?? "").trim();
            userName = String(teacher.fullname ?? "").trim();
            accountIdentifier = String(teacher.username ?? identifier).trim();
            if (!userEmail) {
                return NextResponse.json({ message: genericSuccessMessage });
            }

            const { error: updateErr } = await supabaseAdmin
                .from("stg_teachers")
                .update({ 
                    password: hashedPassword,
                    is_first_login: true 
                })
                .eq("teacher_id", teacher.teacher_id);

            if (updateErr) throw updateErr;
        } 
        
        // ================= ADMIN =================
        else if (role === "admin") {
            let { data: admin, error: fetchErr } = await supabaseAdmin
                .from("stg_admins")
                .select("admin_id, fullname, email")
                .eq("admin_id", identifier)
                .maybeSingle();

            if (fetchErr?.message?.toLowerCase().includes("column")) {
                const fallback = await supabaseAdmin
                    .from("stg_admins")
                    .select("admin_id, fullname")
                    .eq("admin_id", identifier)
                    .maybeSingle();
                admin = fallback.data ? { ...fallback.data, email: null } : null;
                fetchErr = fallback.error;
            }

            if (fetchErr || !admin) {
                return NextResponse.json({ message: genericSuccessMessage });
            }

            userEmail = String(admin.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "").trim();
            userName = String(admin.fullname ?? "").trim();
            accountIdentifier = String(admin.admin_id ?? identifier).trim();
            if (!userEmail) {
                return NextResponse.json({ message: genericSuccessMessage });
            }

            const { error: updateErr } = await supabaseAdmin
                .from("stg_admins")
                .update({
                    password: hashedPassword,
                    is_first_login: true,
                })
                .eq("admin_id", admin.admin_id);

            if (updateErr) throw updateErr;
        }

        if (!userEmail) {
            return NextResponse.json({ message: genericSuccessMessage });
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error("Konfigurasi e-mel belum lengkap");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const safeName = escapeHtml(userName || "Pengguna");
        const safeIdentifier = escapeHtml(accountIdentifier);
        const safePassword = escapeHtml(tempPassword);
        const roleLabel = role === "teacher" ? "Guru" : "Admin";

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: "Set Semula Kata Laluan - Sistem STG SMK Penanti",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Permintaan Set Semula Kata Laluan</h2>
                    <p>Salam sejahtera ${safeName},</p>
                    <p>Sistem telah menerima permintaan untuk menetapkan semula kata laluan bagi akaun anda.</p>
                    <div style="background:#f4f4f4; padding:14px; border-radius:8px; display:inline-block;">
                        <p style="margin:0 0 8px;"><strong>ID ${roleLabel}:</strong> ${safeIdentifier}</p>
                        <p style="margin:0;"><strong>Kata laluan sementara:</strong> ${safePassword}</p>
                    </div>
                    <p>Sila log masuk menggunakan kata laluan ini. Anda akan diminta untuk menukarnya kepada kata laluan baharu dengan segera untuk tujuan keselamatan.</p>
                    <br/>
                    <p><small>Jika anda tidak membuat permintaan ini, sila abaikan e-mel ini.</small></p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json(
            { message: genericSuccessMessage },
            { status: 200 }
        );

    } catch (err) {
        console.error("FORGOT PASSWORD ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan semasa memproses permintaan" },
            { status: 500 }
        );
    }
}
