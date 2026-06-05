"use client";

import { GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { LoginForm } from "./login-form";

const portalFeatures = [
	{
		title: "Pemarkahan Berstruktur",
		desc:
			"Urus markah objektif, subjektif, dan komponen peperiksaan dalam satu sistem.",
	},
	{
		title: "Sokongan OMR Digital",
		desc: "Imbas dan semak jawapan objektif menggunakan aliran kerja digital.",
	},
	{
		title: "Laporan Akademik",
		desc: "Jana slip keputusan dan ringkasan prestasi pelajar secara automatik.",
	},
];

export default function LoginPage() {
	return (
		<main className="min-h-svh bg-background login-grid-bg">
			<div className="grid min-h-svh lg:grid-cols-2">
				{/* LEFT PANEL — Hero content — desktop only */}
				<div className="hidden lg:flex flex-col justify-between px-8 py-8 lg:px-12 xl:px-16 2xl:px-24">
					<header className="animate-app-fade flex items-center justify-between gap-3">
						<Link href="/" className="flex items-center gap-3">
							<Image
								src="/img/smkp-logo.png"
								alt="SMK Penanti"
								width={32}
								height={32}
								priority
							/>
							<span className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
								STG SMK Penanti
							</span>
						</Link>
						<div className="hidden lg:block">
							<ModeToggle />
						</div>
					</header>

					<div className="space-y-10 animate-app-enter text-center">
						<div className="space-y-5">
							<p className="text-xs font-semibold tracking-[0.25em] uppercase text-primary">
								Portal Akademik Sekolah
							</p>
							<h1 className="!text-[60px] font-black leading-[1.05] tracking-tight text-foreground xl:!text-[72px]">
								Sistem
								<br />
								Pemarkahan
								<br />
								<em className="italic text-primary" style={{ fontSize: "inherit" }}>
									Akademik.
								</em>
							</h1>
							<p className="mx-auto max-w-sm text-base leading-7 text-muted-foreground">
								Satu ruang kerja untuk guru, pentadbir, pelajar, panitia, dan pengetua
								mengurus data akademik dengan lebih tersusun.
							</p>
						</div>

						<div className="mx-auto max-w-md divide-y divide-border/40">
							{portalFeatures.map((feature, i) => (
								<div
									key={feature.title}
									className={`flex items-center justify-center gap-6 py-4 animate-app-enter ${
										i === 0
											? "animate-delay-1"
											: i === 1
												? "animate-delay-2"
												: "animate-delay-3"
									}`}
								>
									<span className="min-w-[1.5rem] pt-0.5 text-xs font-bold tabular-nums text-primary/60">
										0{i + 1}
									</span>
									<div className="space-y-0.5 text-left">
										<p className="font-semibold text-foreground">{feature.title}</p>
										<p className="text-sm leading-5 text-muted-foreground">
											{feature.desc}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<footer className="animate-app-fade flex justify-end items-center gap-2 text-xs text-muted-foreground">
						<GraduationCap className="h-3.5 w-3.5" />
						<span>Kubang Semang, Pulau Pinang</span>
					</footer>
				</div>

				{/* RIGHT PANEL — Login card */}
				<div className="flex min-h-svh flex-col items-center justify-center bg-card px-5 py-10 sm:px-8 lg:col-start-2">
					{/* Mobile header */}
					<div className="mb-8 flex w-full max-w-sm items-center justify-between lg:hidden">
						<Link href="/" className="flex items-center gap-2.5">
							<Image
								src="/img/smkp-logo.png"
								alt="SMK Penanti"
								width={28}
								height={28}
								priority
							/>
							<span className="text-sm font-semibold">STG SMK Penanti</span>
						</Link>
						<ModeToggle />
					</div>

					<div className="w-full max-w-[360px] space-y-8 animate-app-enter animate-delay-1">
						<div className="flex items-center justify-center">
							<div className="hidden items-center gap-2.5 lg:flex">
								<Image
									src="/img/smkp-logo.png"
									alt="SMK Penanti"
									width={80}
									height={80}
									priority
								/>
							</div>
						</div>

						<div className="space-y-1.5 text-center">
							<h2 className="!text-[32px] font-black text-foreground">Log Masuk</h2>
							<p className="text-sm text-muted-foreground">
								Pilih jawatan dan masukkan kelayakan anda.
							</p>
						</div>

						<LoginForm />
					</div>

					<p className="mt-10 text-center text-xs text-muted-foreground">
						Sistem akademik dalaman &mdash; SMK Penanti
					</p>
				</div>
			</div>
		</main>
	);
}
