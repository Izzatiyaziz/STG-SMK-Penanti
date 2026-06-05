"use client";

import { useEffect, useState } from "react";

export type AppRole = "admin" | "teacher" | "student" | "principal";

export type SessionData = {
    user_id: string;
    userType: AppRole;
    role: string;
    roles?: string[];
    session_id?: string | null;
    name?: string | null;
};

const SESSION_KEY = "stg_session";

function readSessionFromStorage(): SessionData | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<SessionData>;
        if (!parsed?.user_id || !parsed?.userType) return null;
        return parsed as SessionData;
    } catch {
        return null;
    }
}

export function useSession(expectedType?: AppRole): {
    session: SessionData | null;
    isLoading: boolean;
} {
    const [session, setSession] = useState<SessionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const data = readSessionFromStorage();
        if (data && (!expectedType || data.userType === expectedType)) {
            setSession(data);
        } else {
            setSession(null);
        }
        setIsLoading(false);
    }, [expectedType]);

    return { session, isLoading };
}

export function clearSession(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
    }
}
