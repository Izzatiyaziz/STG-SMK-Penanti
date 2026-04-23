"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Session = {
    user_id: string;
    userType: "student";
    role: string;
    session_id?: string | null;
};

export default function StudentProfilePage() {
    const router = useRouter();
    const [me, setMe] = useState<{ name: string; email?: string } | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("stg_session");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.userType !== "student") return;
            setSession(parsed as Session);
        } catch {
            // ignore
        } finally {
            setSessionChecked(true);
        }
    }, []);

    useEffect(() => {
        if (!sessionChecked) return;
        if (!session) {
            router.replace("/login");
            return;
        }

        fetch("/api/auth/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "student", user_id: session.user_id }),
        })
            .then((r) => r.json())
            .then((data) =>
                setMe({ name: data?.name ?? "Student", email: data?.email })
            )
            .catch(() => setMe({ name: "Student" }));
    }, [router, session, sessionChecked]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-xl mx-auto space-y-6">
                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Akaun Pelajar</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <div>
                            <span className="font-medium text-foreground">
                                {me?.name ?? "Student"}
                            </span>
                        </div>
                        {me?.email && <div>{me.email}</div>}
                        <div className="pt-2">
                            Halaman ini fokus kepada maklumat akaun. Penukaran kata
                            laluan pelajar boleh ditambah jika diperlukan.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
