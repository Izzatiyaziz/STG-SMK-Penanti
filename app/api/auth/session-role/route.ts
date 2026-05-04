import { NextResponse } from "next/server";
import { getServerSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

function normalizeRole(value: unknown) {
    return String(value ?? "").toLowerCase().trim();
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
        }

        if (session.userType !== "teacher") {
            return NextResponse.json(
                { message: "Hanya sesi guru boleh menukar peranan." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const nextRole = normalizeRole(body?.role);
        const availableRoles = Array.isArray(session.roles)
            ? session.roles.map(normalizeRole).filter(Boolean)
            : [];

        if (!nextRole || !availableRoles.includes(nextRole)) {
            return NextResponse.json(
                { message: "Peranan guru tidak sah untuk sesi ini." },
                { status: 400 }
            );
        }

        const response = NextResponse.json({ success: true, role: nextRole });
        setSessionCookie(response, {
            userType: session.userType,
            role: nextRole,
            roles: session.roles,
            user_id: session.user_id,
            session_id: session.session_id ?? null,
            name: session.name ?? null,
        });

        return response;
    } catch (err) {
        console.error("SYNC SESSION ROLE ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
