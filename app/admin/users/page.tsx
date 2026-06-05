"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	FileCheck2,
	FileText,
	FileSignature,
	Database,
	Folder,
} from "lucide-react";

const sections = [
	{
		title: "Guru",
		desc: "Tambah, edit, dan tetapkan peranan guru.",
		href: "/admin/teacher",
		label: "Buka Pengurusan Guru",
	},
	{
		title: "Pelajar",
		desc: "Tambah, edit, dan tetapkan kelas pelajar.",
		href: "/admin/student",
		label: "Buka Pengurusan Pelajar",
	},
];

const quickLinks = [
	{ href: "/admin/assignments", label: "Assign Guru", icon: FileSignature },
	{ href: "/admin/exams", label: "Peperiksaan", icon: FileCheck2 },
	{ href: "/admin/reports", label: "Laporan", icon: FileText },
	{ href: "/admin/classes", label: "Kelas", icon: Database },
	{ href: "/admin/subjects", label: "Subjek", icon: Folder },
];

export default function AdminUsersPage() {
	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6">
				<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
					Pentadbiran
				</p>
				<h1 className="!text-[36px] font-black leading-tight text-foreground">
					Pengguna
				</h1>
			</div>

			<div className="grid grid-cols-1 gap-px bg-border/40 sm:grid-cols-2">
				{sections.map((s) => (
					<div key={s.href} className="flex flex-col gap-4 bg-card p-6">
						<div>
							<p className="font-semibold text-foreground">{s.title}</p>
							<p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
						</div>
						<Button asChild size="sm" className="self-start">
							<Link href={s.href}>{s.label}</Link>
						</Button>
					</div>
				))}
			</div>

			<div>
				<p className="mb-3 text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
					Pautan Pantas
				</p>
				<div className="flex flex-wrap gap-2">
					{quickLinks.map(({ href, label, icon: Icon }) => (
						<Button key={href} asChild variant="outline" size="sm">
							<Link href={href}>
								<Icon className="w-3.5 h-3.5" />
								<span className="ml-1.5">{label}</span>
							</Link>
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
