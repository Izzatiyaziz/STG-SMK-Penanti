import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
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

        const [{ data: sessions, error: sessionError }, { data: events, error: eventError }] =
            await Promise.all([
                supabaseAdmin
                    .from("stg_sessions")
                    .select(
                        "session_id, user_id, user_name, role, action, login_time, logout_time"
                    )
                    .order("login_time", { ascending: false })
                    .limit(limit),
                supabaseAdmin
                    .from("stg_security_events")
                    .select(
                        "event_id, event_type, severity, status, ip_address, identifier, role, endpoint, details, created_at"
                    )
                    .order("created_at", { ascending: false })
                    .limit(limit),
            ]);

        if (sessionError) {
            return NextResponse.json(
                { message: sessionError.message, data: [] },
                { status: 500 }
            );
        }

        if (eventError) {
            console.error("SECURITY EVENTS LIST ERROR:", eventError.message);
        }

        const sessionRows = (sessions ?? []).map((row) => ({
            ...row,
            record_type: "session",
            severity: "low",
            status: "success",
            ip_address: null,
            identifier: row.user_id,
            endpoint: null,
            details: null,
            event_time: row.login_time,
        }));

        const securityRows = (events ?? []).map((row) => ({
            session_id: row.event_id,
            user_id: row.identifier ?? "Tidak diketahui",
            user_name: row.identifier ?? "Tidak diketahui",
            role: row.role ?? "unknown",
            action: row.event_type,
            login_time: row.created_at,
            logout_time: null,
            record_type: "security",
            severity: row.severity,
            status: row.status,
            ip_address: row.ip_address,
            identifier: row.identifier,
            endpoint: row.endpoint,
            details: row.details,
            event_time: row.created_at,
        }));

        const combined = [...sessionRows, ...securityRows]
            .sort(
                (a, b) =>
                    new Date(b.event_time).getTime() -
                    new Date(a.event_time).getTime()
            )
            .slice(0, limit);

        return NextResponse.json({ data: combined });
    } catch (err) {
        console.error("SESSIONS LIST ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
