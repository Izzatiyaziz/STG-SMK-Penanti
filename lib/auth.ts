import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "stg_auth";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AppRole = "admin" | "teacher" | "student";

export type SessionUser = {
    userType: AppRole;
    role: string;
    roles?: string[];
    user_id: string;
    session_id?: string | null;
    name?: string | null;
    expiresAt: number;
};

type ApiGuard =
    | { session: SessionUser }
    | { response: NextResponse };

function getSessionSecret() {
    const secret = process.env.STG_SESSION_SECRET;

    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("Missing STG_SESSION_SECRET");
    }

    const developmentSecret =
        secret ||
        process.env.EMAIL_PASS ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!developmentSecret) {
        throw new Error("Missing STG_SESSION_SECRET");
    }

    return developmentSecret;
}

function base64UrlEncode(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
    return createHmac("sha256", getSessionSecret())
        .update(payload)
        .digest("base64url");
}

function normalizeRole(role: string) {
    return role.toLowerCase().trim();
}

function normalizeSession(session: Omit<SessionUser, "expiresAt">): SessionUser {
    return {
        ...session,
        role: normalizeRole(session.role),
        roles: Array.isArray(session.roles)
            ? session.roles.map(normalizeRole).filter(Boolean)
            : undefined,
        user_id: String(session.user_id),
        session_id: session.session_id ?? null,
        expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    };
}

export function createSessionToken(session: Omit<SessionUser, "expiresAt">) {
    const normalized = normalizeSession(session);
    const payload = base64UrlEncode(JSON.stringify(normalized));
    return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null) {
    if (!token) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = sign(payload);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (
        expectedBuffer.length !== signatureBuffer.length ||
        !timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
        return null;
    }

    try {
        const parsed = JSON.parse(base64UrlDecode(payload)) as SessionUser;
        if (!parsed.userType || !parsed.user_id || !parsed.role) return null;
        if (!parsed.expiresAt || parsed.expiresAt <= Date.now()) return null;
        return {
            ...parsed,
            role: normalizeRole(parsed.role),
            roles: Array.isArray(parsed.roles)
                ? parsed.roles.map(normalizeRole).filter(Boolean)
                : undefined,
        };
    } catch {
        return null;
    }
}

export async function getServerSession() {
    const cookieStore = await cookies();
    return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export function setSessionCookie(
    response: NextResponse,
    session: Omit<SessionUser, "expiresAt">
) {
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: createSessionToken(session),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    });
}

export function clearSessionCookie(response: NextResponse) {
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
}

function sessionHasRole(session: SessionUser, allowed: string[]) {
    const normalizedAllowed = allowed.map(normalizeRole);
    const roles = new Set([
        normalizeRole(session.userType),
        normalizeRole(session.role),
        ...(session.roles ?? []),
    ]);

    return normalizedAllowed.some((role) => roles.has(role));
}

export async function requireApiRole(
    allowedRoles: string | string[]
): Promise<ApiGuard> {
    const session = await getServerSession();
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!session) {
        return {
            response: NextResponse.json(
                { message: "Unauthenticated" },
                { status: 401 }
            ),
        };
    }

    if (!sessionHasRole(session, allowed)) {
        return {
            response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
        };
    }

    return { session };
}

export async function requireApiSession(): Promise<ApiGuard> {
    const session = await getServerSession();

    if (!session) {
        return {
            response: NextResponse.json(
                { message: "Unauthenticated" },
                { status: 401 }
            ),
        };
    }

    return { session };
}

export async function requirePageRole(
    allowedRoles: string | string[],
    fallbackPath = "/login"
) {
    const session = await getServerSession();
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!session || !sessionHasRole(session, allowed)) {
        redirect(fallbackPath);
    }

    return session;
}
