"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, GraduationCap, Hash, IdCard, School } from "lucide-react";

import { ProfileShell } from "@/components/profile/profile-shell";
import { Badge } from "@/components/ui/badge";
import { formatMalaysiaDate } from "@/lib/date-utils";

type Session = {
    user_id: string;
    userType: "student";
    role: string;
    session_id?: string | null;
};

type StudentProfile = {
    student_id: string;
    name: string;
    email?: string;
    ic_number?: string | null;
    class_id?: string | null;
    class_name?: string | null;
    class_grade?: number | null;
    level?: string | null;
    status?: string | null;
    enrollment_date?: string | null;
    created_at?: string | null;
};

function statusLabel(status?: string | null) {
    return String(status ?? "").toLowerCase() === "inactive" ? "Tidak Aktif" : "Aktif";
}

function statusClassName(status?: string | null) {
    return String(status ?? "").toLowerCase() === "inactive"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function DetailItem({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof IdCard;
    label: string;
    value: string;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3">
            <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-foreground">{value || "-"}</p>
            </div>
        </div>
    );
}

export default function StudentProfilePage() {
    const router = useRouter();
    const [me, setMe] = useState<StudentProfile | null>(null);
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
                setMe({
                    student_id: String(data?.student_id ?? session.user_id),
                    name: data?.name ?? "Student",
                    email: data?.email,
                    ic_number: data?.ic_number ?? null,
                    class_id: data?.class_id ?? null,
                    class_name: data?.class_name ?? null,
                    class_grade: data?.class_grade ?? null,
                    level: data?.level ?? null,
                    status: data?.status ?? null,
                    enrollment_date: data?.enrollment_date ?? null,
                    created_at: data?.created_at ?? null,
                })
            )
            .catch(() => setMe({ student_id: session.user_id, name: "Student" }));
    }, [router, session, sessionChecked]);

    const level = me?.level || (me?.class_grade ? String(me.class_grade) : "");
    const classLabel = [me?.class_grade ? `Tingkatan ${me.class_grade}` : "", me?.class_name ?? ""]
        .filter(Boolean)
        .join(" ");

    return (
        <ProfileShell
            accountLabel="Akaun Pelajar"
            name={me?.name ?? "Student"}
            email={me?.email}
            roleLabel="Pelajar"
            accentLabel="Paparan"
            accentValue="Maklumat Akaun"
            note="Maklumat profil ini diambil daripada rekod pendaftaran pelajar oleh admin. Jika ada kesilapan, sila maklumkan kepada pihak pentadbiran sekolah."
            profileDetailsContent={
                <section className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Maklumat Pelajar</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Butiran rasmi yang telah didaftarkan dalam sistem.
                            </p>
                        </div>
                        <Badge variant="outline" className={statusClassName(me?.status)}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            {statusLabel(me?.status)}
                        </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <DetailItem icon={Hash} label="ID Pelajar" value={me?.student_id ?? session?.user_id ?? "-"} />
                        <DetailItem icon={IdCard} label="No. Kad Pengenalan" value={me?.ic_number ?? "-"} />
                        <DetailItem icon={GraduationCap} label="Tingkatan" value={level ? `Tingkatan ${level}` : "-"} />
                        <DetailItem icon={School} label="Kelas Semasa" value={classLabel || me?.class_name || "-"} />
                        <DetailItem
                            icon={CalendarDays}
                            label="Tarikh Kemasukan"
                            value={formatMalaysiaDate(me?.enrollment_date, "-")}
                        />
                        <DetailItem
                            icon={CalendarDays}
                            label="Tarikh Didaftarkan"
                            value={formatMalaysiaDate(me?.created_at, "-")}
                        />
                    </div>
                </section>
            }
        />
    );
}
