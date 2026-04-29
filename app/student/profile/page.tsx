"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileShell } from "@/components/profile/profile-shell";

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
        <ProfileShell
            accountLabel="Akaun Pelajar"
            name={me?.name ?? "Student"}
            email={me?.email}
            roleLabel="Pelajar"
            accentLabel="Paparan"
            accentValue="Maklumat Akaun"
            note="Halaman ini memfokuskan maklumat akaun pelajar. Jika perlu, tetapan tambahan seperti penukaran kata laluan atau kemas kini profil boleh ditambah kemudian."
        />
    );
}
