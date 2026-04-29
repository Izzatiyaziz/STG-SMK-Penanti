"use client";

import { ReactNode } from "react";
import {
	BadgeCheck,
	KeyRound,
	Mail,
	ShieldCheck,
	UserCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileShellProps = {
	accountLabel: string;
	name: string;
	email?: string;
	roleLabel: string;
	accentLabel: string;
	accentValue: string;
	note?: string;
	securityTitle?: string;
	securityDescription?: string;
	securityContent?: ReactNode;
};

export function ProfileShell({
	accountLabel,
	name,
	email,
	roleLabel,
	accentLabel,
	accentValue,
	note,
	securityTitle,
	securityDescription,
	securityContent,
}: ProfileShellProps) {
	return (
		<div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 p-4 sm:p-5 md:p-6">
            <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
				<div className="flex flex-col gap-3">
					<div className="flex items-start gap-3 sm:items-center">
						<div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 shadow-sm sm:p-3">
							<UserCircle2 className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
						</div>
						<div className="min-w-0">
							<h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
								{accountLabel}
							</h1>
							<p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
								Maklumat akaun dan tetapan keselamatan anda.
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
					<Card className="overflow-hidden border border-border/50 shadow-lg pt-0">
						<div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-5 sm:px-6 sm:py-6">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
									<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-background/80 shadow-sm sm:h-16 sm:w-16">
										<span className="text-xl font-bold text-primary sm:text-2xl">
											{name.charAt(0).toUpperCase()}
										</span>
									</div>
									<div className="min-w-0 w-full">
										<div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
											<h2 className="w-full break-words text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
												{name}
											</h2>
											<Badge
												variant="secondary"
												className="max-w-full rounded-full border border-primary/15 bg-primary/10 text-primary"
											>
												<BadgeCheck className="mr-1 h-3 w-3" />
												{roleLabel}
											</Badge>
										</div>
										<div className="mt-2 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
											<Mail className="mt-0.5 h-4 w-4 shrink-0" />
											<span className="min-w-0 break-all sm:break-words">
												{email ?? "Tiada emel direkodkan"}
											</span>
										</div>
									</div>
								</div>
								<div className="w-full rounded-xl border border-border/60 bg-background/90 px-4 py-3 shadow-sm sm:w-auto sm:min-w-44">
									<div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
										{accentLabel}
									</div>
									<div className="mt-1 break-words text-base font-semibold text-foreground">
										{accentValue}
									</div>
								</div>
							</div>
						</div>

						<CardContent className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2">
							<ProfileInfoTile
								icon={<ShieldCheck className="h-5 w-5 text-primary" />}
								label="Status Akaun"
								value="Aktif"
								hint="Akses sistem tersedia."
							/>
							<ProfileInfoTile
								icon={<Mail className="h-5 w-5 text-primary" />}
								label="Emel"
								value={email ?? "Belum ditetapkan"}
								hint="Digunakan untuk pengesahan akaun."
							/>
							<ProfileInfoTile
								icon={<KeyRound className="h-5 w-5 text-primary" />}
								label="Keselamatan"
								value="Kata laluan dilindungi"
								hint="Kemas kini jika perlu."
							/>
						</CardContent>
					</Card>

					<div className="space-y-6">
						{note && (
							<Card className="border border-border/50 shadow-md">
								<CardHeader className="px-4 pb-3 pt-5 sm:px-6">
									<CardTitle className="text-base">Nota Akaun</CardTitle>
								</CardHeader>
								<CardContent className="px-4 pb-5 text-sm leading-6 text-muted-foreground sm:px-6">
									{note}
								</CardContent>
							</Card>
						)}

						{securityContent && (
							<Card className="border border-border/50 shadow-lg">
								<CardHeader className="space-y-2 px-4 pt-5 sm:px-6">
									<CardTitle>{securityTitle ?? "Tetapan Keselamatan"}</CardTitle>
									{securityDescription && (
										<p className="text-sm text-muted-foreground">{securityDescription}</p>
									)}
								</CardHeader>
								<CardContent className="px-4 pb-5 sm:px-6">
									{securityContent}
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function ProfileInfoTile({
	icon,
	label,
	value,
	hint,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	hint: string;
}) {
	return (
		<div className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
			<div className="flex items-start gap-2">
				<div className="rounded-lg bg-primary/10 p-2">{icon}</div>
				<div className="min-w-0 text-sm font-medium text-muted-foreground">
					{label}
				</div>
			</div>
			<div className="mt-4 break-words text-base font-semibold text-foreground">
				{value}
			</div>
			<div className="mt-1 text-sm text-muted-foreground">{hint}</div>
		</div>
	);
}
