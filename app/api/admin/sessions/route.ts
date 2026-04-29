import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const limit = Math.min(
            Math.max(Number(searchParams.get("limit") ?? 50), 1),
            200
        );

        const { data, error } = await supabase
            .from("stg_sessions")
            .select(
                "session_id, user_id, user_name, role, action, login_time, logout_time"
            )
            .order("login_time", { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json(
                { message: error.message, data: [] },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: data ?? [] });
    } catch (err) {
        console.error("SESSIONS LIST ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
