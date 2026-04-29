import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    return NextResponse.json(
        { message: "Not implemented" },
        { status: 404 }
    );
}
