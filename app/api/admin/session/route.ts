import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        // Ambil 50 log terakhir dan susun dari yang terkini
        const { data, error } = await supabase
            .from("stg_sessions")
            .select("session_id, user_id, user_name, role, action, login_time, logout_time")
            .order("login_time", { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        console.error("SESSION FETCH ERROR:", error);
        return NextResponse.json(
            { message: "Gagal mengambil log sesi", error: error.message },
            { status: 500 }
        );
    }
}
