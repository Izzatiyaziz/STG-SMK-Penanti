import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import nodemailer from "nodemailer"; // 🔥 Import Nodemailer
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

        // Jana kata laluan rawak sementara (Cth: temp-A1B2C)
        const randomString = randomBytes(4).toString("hex").toUpperCase();
        const tempPassword = `temp-${randomString}`;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        let userEmail = "";

        // ================= GURU =================
        if (role === "teacher") {
            const { data: teacher, error: fetchErr } = await supabase
                .from("stg_teachers")
                .select("teacher_id, email, fullname")
                .eq("username", identifier)
                .single();

            if (fetchErr || !teacher) {
                return NextResponse.json({ message: genericSuccessMessage });
            }

            userEmail = String(teacher.email ?? "").trim();
            if (!userEmail) {
                return NextResponse.json({ message: genericSuccessMessage });
            }

            const { error: updateErr } = await supabase
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
            return NextResponse.json({ message: genericSuccessMessage });
        }

        if (!userEmail) {
            return NextResponse.json({ message: genericSuccessMessage });
        }

        // ================= PENGHANTARAN E-MEL SEBENAR =================
        // Konfigurasi transporter (Pastikan EMAIL_USER dan EMAIL_PASS ada dalam .env)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Tetapan isi kandungan e-mel
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: "Set Semula Kata Laluan - Sistem STG SMK Penanti",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Permintaan Set Semula Kata Laluan</h2>
                    <p>Salam sejahtera,</p>
                    <p>Sistem telah menerima permintaan untuk menetapkan semula kata laluan bagi akaun anda.</p>
                    <p>Kata laluan sementara anda adalah:</p>
                    <h3 style="background-color: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
                        ${tempPassword}
                    </h3>
                    <p>Sila log masuk menggunakan kata laluan ini. Anda akan diminta untuk menukarnya kepada kata laluan baharu dengan segera untuk tujuan keselamatan.</p>
                    <br/>
                    <p><small>Jika anda tidak membuat permintaan ini, sila abaikan e-mel ini.</small></p>
                </div>
            `,
        };

        // Arahkan nodemailer untuk hantar
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
