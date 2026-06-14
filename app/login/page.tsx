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
		<main className="h-svh overflow-hidden bg-background login-grid-bg">
			<div className="grid h-full lg:grid-cols-2">
				{/* LEFT PANEL — Hero content — desktop only */}
				<div className="hidden h-full flex-col justify-between px-8 py-6 lg:flex lg:px-12 xl:px-16 2xl:px-24">
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

					<div className="animate-app-enter space-y-6 text-center">
						<div className="space-y-3">
							<p className="text-xs font-semibold tracking-[0.25em] uppercase text-primary">
								Portal Akademik Sekolah
							</p>
							<h1 className="!text-[48px] font-black leading-[1.02] tracking-tight text-foreground xl:!text-[60px]">
								Sistem
								<br />
								Pemarkahan
								<br />
								<em className="italic text-primary" style={{ fontSize: "inherit" }}>
									Automatik.
								</em>
							</h1>
							<p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
								Satu platform yang menyokong pengurusan data pemarkahan dan maklumat akademik bagi guru, 
								pelajar, panitia, pentadbir, dan pengetua.
							</p>
						</div>

						<div className="mx-auto max-w-md divide-y divide-border/40">
							{portalFeatures.map((feature, i) => (
								<div
									key={feature.title}
									className={`flex items-center justify-center gap-5 py-2.5 animate-app-enter ${
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
				<div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-card px-5 py-5 sm:px-8 lg:col-start-2">
					{/* Mobile header */}
					<div className="mb-5 flex w-full max-w-sm items-center justify-between lg:hidden">
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

					<div className="w-full max-w-[360px] space-y-5 animate-app-enter animate-delay-1">
						<div className="flex items-center justify-center">
							<div className="hidden items-center gap-2.5 lg:flex">
								<Image
									src="/img/smkp-logo.png"
									alt="SMK Penanti"
									width={64}
									height={64}
									priority
								/>
							</div>
						</div>

						<div className="space-y-1.5 text-center">
							<h2 className="!text-[28px] font-black text-foreground">Log Masuk</h2>
							<p className="text-sm text-muted-foreground">
								Pilih jawatan dan masukkan kelayakan anda.
							</p>
						</div>

						<LoginForm />
					</div>

					<p className="mt-5 text-center text-xs text-muted-foreground">
						Sistem akademik dalaman &mdash; SMK Penanti
					</p>
				</div>
			</div>
		</main>
	);
}
