import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const session_id = String(body?.session_id ?? "").trim();

        if (!session_id) {
            return NextResponse.json(
                { message: "session_id diperlukan" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_sessions")
            .update({
                action: "Log Keluar",
                logout_time: new Date().toISOString(),
            })
            .eq("session_id", session_id);

        if (error) {
            return NextResponse.json(
                { message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("LOGOUT ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

