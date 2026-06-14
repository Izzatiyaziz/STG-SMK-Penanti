import supabaseAdmin from "@/lib/supabase-admin";
import { sanitizePlainText } from "@/lib/security";

export type SecurityEventType =
    | "failed_login"
    | "brute_force"
    | "password_reset_abuse"
    | "xss_attempt"
    | "filter_injection";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export async function logSecurityEvent(event: {
    eventType: SecurityEventType;
    severity: SecuritySeverity;
    status?: "blocked" | "detected";
    ipAddress?: string | null;
    identifier?: string | null;
    role?: string | null;
    endpoint: string;
    details?: Record<string, string | number | boolean | null>;
}) {
    try {
        const { error } = await supabaseAdmin.from("stg_security_events").insert({
            event_type: event.eventType,
            severity: event.severity,
            status: event.status ?? "blocked",
            ip_address: sanitizePlainText(event.ipAddress, 100) || null,
            identifier: sanitizePlainText(event.identifier, 150) || null,
            role: sanitizePlainText(event.role, 50) || null,
            endpoint: sanitizePlainText(event.endpoint, 200),
            details: event.details ?? {},
        });

        if (error) {
            console.error("SECURITY EVENT LOG ERROR:", error.message);
        }
    } catch (error) {
        console.error("SECURITY EVENT LOG ERROR:", error);
    }
}
