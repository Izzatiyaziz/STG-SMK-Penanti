import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import nodemailer from "nodemailer"; // 🔥 Import Nodemailer
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { role, identifier } = body;

        if (!role || !identifier) {
            return NextResponse.json(
                { message: "Peranan dan ID diperlukan" },
                { status: 400 }
            );
        }

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
                return NextResponse.json({ message: "ID pengguna tidak dijumpai." }, { status: 404 });
            }

            userEmail = String(teacher.email ?? "").trim();
            if (!userEmail) {
                return NextResponse.json(
                    { message: "Guru ini tidak mempunyai rekod e-mel yang sah." },
                    { status: 400 }
                );
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
            return NextResponse.json(
                {
                    message:
                        "Tetapan semula kata laluan admin melalui e-mel belum disokong kerana jadual stg_admins tidak mempunyai kolum e-mel.",
                },
                { status: 400 }
            );
        }

        if (!userEmail) {
            return NextResponse.json(
                { message: "Pengguna ini tidak mempunyai rekod e-mel yang sah." },
                { status: 400 }
            );
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
            { message: "Kata laluan sementara berjaya dihantar ke e-mel" },
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
