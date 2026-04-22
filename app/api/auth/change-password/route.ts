import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { user_id, new_password } = body;

        // Semak jika data yang diperlukan wujud
        if (!user_id || !new_password) {
            return NextResponse.json(
                { message: "ID pengguna dan kata laluan baharu diperlukan" },
                { status: 400 }
            );
        }

        // Semak panjang kata laluan (optional tapi digalakkan)
        if (new_password.length < 8) {
            return NextResponse.json(
                { message: "Kata laluan mesti mengandungi sekurang-kurangnya 8 aksara" },
                { status: 400 }
            );
        }

        // Hash kata laluan baharu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // Kemas kini jadual stg_teachers
        const { error } = await supabase
            .from("stg_teachers")
            .update({
                password: hashedPassword,
                is_first_login: false // 🔥 Tukar ke false supaya dialog tidak keluar lagi
            })
            .eq("teacher_id", user_id);

        if (error) {
            console.error("SUPABASE UPDATE ERROR:", error);
            throw new Error("Gagal mengemas kini pangkalan data");
        }

        // Pulangkan respons berjaya
        return NextResponse.json(
            { message: "Kata laluan berjaya dikemas kini" },
            { status: 200 }
        );

    } catch (err) {
        console.error("CHANGE PASSWORD ERROR:", err);
        return NextResponse.json(
            { message: "Ralat pelayan semasa mengemas kini kata laluan" },
            { status: 500 }
        );
    }
}