"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, LayoutDashboard, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProfileShell } from "@/components/profile/profile-shell";

type Session = { user_id: string; userType: "principal"; role: string };

export default function PrincipalProfilePage() {
	const router = useRouter();
	const [session] = useState<Session | null>(() => {
		if (typeof window === "undefined") return null;
		try {
			const parsed = JSON.parse(localStorage.getItem("stg_session") ?? "null") as Session | null;
			return parsed?.userType === "principal" ? parsed : null;
		} catch {
			return null;
		}
	});
	const [me, setMe] = useState<{ name: string; email?: string; staff_id?: string } | null>(null);

	useEffect(() => {
		if (!session) {
			router.replace("/login");
			return;
		}
		fetch("/api/auth/me", { method: "POST" })
			.then((response) => response.json())
			.then((data) => setMe({ name: data?.name ?? "Pengetua", email: data?.email, staff_id: data?.staff_id }));
	}, [router, session]);

	if (!session) return null;

	return (
		<ProfileShell
			accountLabel="Akaun Pengetua"
			name={me?.name ?? "Pengetua"}
			email={me?.email}
			roleLabel="Pengetua"
			note="Akaun pengetua mempunyai akses paparan kepada dashboard prestasi sekolah."
			profileDetailsContent={
				<div className="space-y-5">
					<section className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<IdCard className="h-4 w-4 text-primary" />
							Butiran Pengetua
						</div>
						<div className="mt-4 grid gap-3 sm:grid-cols-2">
							<div className="rounded-xl border border-border/60 bg-background px-4 py-3">
								<div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">ID Guru</div>
								<div className="mt-1 font-semibold">{me?.staff_id ?? session.user_id}</div>
							</div>
							<div className="rounded-xl border border-border/60 bg-background px-4 py-3">
								<div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Status Akaun</div>
								<Badge className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700">Aktif</Badge>
							</div>
						</div>
					</section>
					<section className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<ShieldCheck className="h-4 w-4 text-primary" />
							Akses Sistem
						</div>
						<div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
								<LayoutDashboard className="h-4 w-4" />
							</div>
							<span className="text-sm font-semibold">Dashboard</span>
						</div>
					</section>
				</div>
			}
		/>
	);
}
