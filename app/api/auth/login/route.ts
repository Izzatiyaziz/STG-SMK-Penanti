import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import supabase from "@/lib/supabase";
import { setSessionCookie } from "@/lib/auth";
import {
    clearRateLimit,
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

        if (!["admin", "teacher", "student"].includes(role)) {
            return NextResponse.json({ message: "Jawatan diperlukan" }, { status: 400 });
        }

        const rawIdentifier =
            role === "student"
                ? body?.ic_number
                : role === "admin"
                  ? body?.admin_id
                  : body?.username;
        const identifier = normalizeLoginIdentifier(rawIdentifier);
        const clientIp = getClientIp(req);
        const ipLimitKey = `login:ip:${rateLimitKey(clientIp)}`;
        const accountLimitKey = `login:account:${rateLimitKey(`${role}:${identifier.toLowerCase()}`)}`;
        const ipLimit = consumeRateLimit(ipLimitKey, {
            limit: 30,
            windowMs: 5 * 60 * 1000,
        });
        const accountLimit = consumeRateLimit(accountLimitKey, {
            limit: 6,
            windowMs: 5 * 60 * 1000,
        });

        if (!ipLimit.allowed || !accountLimit.allowed) {
            await logSecurityEvent({
                eventType: "brute_force",
                severity: "high",
                ipAddress: clientIp,
                identifier,
                role,
                endpoint: "/api/auth/login",
                details: { reason: "Had percubaan log masuk dicapai" },
            });
            const retryAfterSeconds = Math.max(
                ipLimit.retryAfterSeconds,
                accountLimit.retryAfterSeconds
            );
            return NextResponse.json(
                {
                    message:
                        "Terlalu banyak percubaan log masuk. Sila cuba semula sebentar lagi.",
                },
                {
                    status: 429,
                    headers: { "Retry-After": String(retryAfterSeconds) },
                }
            );
        }

        if (!identifier) {
            return NextResponse.json(
                { message: "Maklumat log masuk diperlukan" },
                { status: 400 }
            );
        }

        async function createSessionLog(params: {
            user_id: string;
            user_name?: string | null;
            role: "admin" | "teacher" | "student";
        }) {
            try {
                const { data, error } = await supabase
                    .from("stg_sessions")
                    .insert({
                        user_id: params.user_id,
                        user_name: params.user_name ?? null,
                        role: params.role,
                        action: "Log Masuk",
                    })
                    .select("session_id")
                    .single();

                if (error) return null;
                return data?.session_id ?? null;
            } catch {
                return null;
            }
        }

        // ================= STUDENT =================
        if (role === "student") {
            const ic_number = identifier;

            const { data: student, error } = await supabase
                .from("stg_students")
                .select("student_id, fullname, status")
                .eq("ic_number", ic_number)
                .single();

            if (error || !student) {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    status: "detected",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "Maklumat log masuk tidak sah" },
                });
                return NextResponse.json({ message: "Maklumat log masuk tidak sah" }, { status: 401 });
            }
            if (student.status !== "active") {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "Akaun tidak aktif" },
                });
                return NextResponse.json({ message: "Akaun pelajar tidak aktif" }, { status: 403 });
            }

            clearRateLimit(accountLimitKey);
            const session_id = await createSessionLog({
                user_id: String(student.student_id),
                user_name: student.fullname ?? null,
                role: "student",
            });

            const response = NextResponse.json({
                role: "student",
                user_id: student.student_id,
                session_id,
            });
            setSessionCookie(response, {
                userType: "student",
                role: "student",
                user_id: String(student.student_id),
                session_id,
                name: student.fullname ?? null,
            });
            return response;
        }

        // ================= ADMIN =================
        if (role === "admin") {
            const admin_id = identifier;
            const password = typeof body?.password === "string" ? body.password : "";
            if (!password || password.length > 256) return NextResponse.json({ message: "ID & Kata Laluan diperlukan" }, { status: 400 });

            let { data: admin, error } = await supabase
                .from("stg_admins")
                .select("admin_id, password, fullname, status, is_first_login")
                .eq("admin_id", admin_id)
                .single();

            if (error?.message?.toLowerCase().includes("column")) {
                const fallback = await supabase
                    .from("stg_admins")
                    .select("admin_id, password, fullname")
                    .eq("admin_id", admin_id)
                    .single();
                admin = fallback.data
                    ? { ...fallback.data, status: "active", is_first_login: false }
                    : null;
                error = fallback.error;
            }

            if (error || !admin) {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    status: "detected",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "ID atau kata laluan tidak sah" },
                });
                return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });
            }

            if (admin.status && admin.status !== "active") {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "Akaun tidak aktif" },
                });
                return NextResponse.json({ message: "Akaun admin tidak aktif" }, { status: 403 });
            }

            const valid = await bcrypt.compare(password, admin.password);
            if (!valid) {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    status: "detected",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "ID atau kata laluan tidak sah" },
                });
                return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });
            }

            clearRateLimit(accountLimitKey);
            const session_id = await createSessionLog({
                user_id: String(admin.admin_id),
                user_name: admin.fullname ?? null,
                role: "admin",
            });

            const response = NextResponse.json({
                role: "admin",
                user_id: admin.admin_id,
                session_id,
                must_change_password: admin.is_first_login === true,
            });
            setSessionCookie(response, {
                userType: "admin",
                role: "admin",
                user_id: String(admin.admin_id),
                session_id,
                name: admin.fullname ?? null,
            });
            return response;
        }

        // ================= TEACHER =================
        if (role === "teacher") {
            const username = identifier;
            const password = typeof body?.password === "string" ? body.password : "";
            const selectedTeacherRole = String(body?.selected_teacher_role ?? "")
                .toLowerCase()
                .trim();
            if (!password || password.length > 256) return NextResponse.json({ message: "ID & Kata Laluan diperlukan" }, { status: 400 });

            const { data: teacher, error } = await supabase
                .from("stg_teachers")
                .select("teacher_id, password, fullname, status, is_first_login")
                .eq("username", username)
                .single();

            if (error || !teacher) {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    status: "detected",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "ID atau kata laluan tidak sah" },
                });
                return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });
            }

            if (teacher.status && teacher.status !== "active") {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "Akaun tidak aktif" },
                });
                return NextResponse.json({ message: "Akaun guru tidak aktif" }, { status: 403 });
            }

            const valid = await bcrypt.compare(password, teacher.password);
            if (!valid) {
                await logSecurityEvent({
                    eventType: "failed_login",
                    severity: "medium",
                    status: "detected",
                    ipAddress: clientIp,
                    identifier,
                    role,
                    endpoint: "/api/auth/login",
                    details: { reason: "ID atau kata laluan tidak sah" },
                });
                return NextResponse.json({ message: "Kelayakan tidak sah" }, { status: 401 });
            }

            clearRateLimit(accountLimitKey);
            // Dapatkan Peranan (Role) Guru
            const { data: teacherRoles } = await supabase
                .from("stg_teacher_roles")
                .select("role_id")
                .eq("teacher_id", teacher.teacher_id);

            const roleIds = teacherRoles?.map((r) => r.role_id) ?? [];
            let roleNames: string[] = [];
            
            if (roleIds.length > 0) {
                const { data: roles } = await supabase
                    .from("stg_roles")
                    .select("role_name")
                    .in("role_id", roleIds);
                roleNames = roles?.map((r) => r.role_name) ?? [];
            }

            const normalizedRoleNames = roleNames
                .map((r) => String(r).toLowerCase().trim())
                .filter(Boolean);
            const effectiveRole =
                selectedTeacherRole && normalizedRoleNames.includes(selectedTeacherRole)
                    ? selectedTeacherRole
                    : normalizedRoleNames[0] ?? "teacher";

            const session_id = await createSessionLog({
                user_id: String(teacher.teacher_id),
                user_name: teacher.fullname ?? null,
                role: "teacher",
            });

            const response = NextResponse.json({
                role: effectiveRole,
                user_id: teacher.teacher_id,
                fullname: teacher.fullname,
                roles: roleNames,
                session_id,
                must_change_password: teacher.is_first_login === true,
            });
            setSessionCookie(response, {
                userType: "teacher",
                role: effectiveRole,
                roles: roleNames,
                user_id: String(teacher.teacher_id),
                session_id,
                name: teacher.fullname ?? null,
            });
            return response;
        }

        return NextResponse.json({ message: "Peranan tidak sah" }, { status: 400 });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
