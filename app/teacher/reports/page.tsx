"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, CheckCircle, Users } from "lucide-react";
import { toast } from "sonner";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
};

type Exam = { id: string; name: string; academic_year: string };

type ReportStudent = {
	student_id: string;
	student_name: string;
	subjects: Array<{
		subject_id: string;
		name: string;
		mark: number;
		grade: string;
	}>;
	average_mark: number;
	position: number | null;
	comment: string;
};

export default function ClassTeacherReportPage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);

	const [exams, setExams] = useState<Exam[]>([]);
	const [examId, setExamId] = useState("");

	const [classInfo, setClassInfo] = useState<{
		id: string;
		name: string;
		grade: number | null;
	} | null>(null);
	const [students, setStudents] = useState<ReportStudent[]>([]);
	const [loading, setLoading] = useState(false);
	const [generating, setGenerating] = useState(false);

	const [commentStudent, setCommentStudent] = useState<ReportStudent | null>(
		null,
	);
	const [commentText, setCommentText] = useState("");

	useEffect(() => {
		try {
			const raw = localStorage.getItem("stg_session");
			if (!raw) return;
			const parsed = JSON.parse(raw);
			if (parsed?.userType !== "teacher") return;
			setSession(parsed as Session);
		} catch {
			// ignore
		} finally {
			setSessionReady(true);
		}
	}, []);

	useEffect(() => {
		if (!sessionReady) return;
		if (!session) {
			router.replace("/login");
			return;
		}

		const role = String(session.role ?? "")
			.toLowerCase()
			.trim();
		if (role !== "class teacher") {
			toast.error("Hanya Guru Kelas boleh akses halaman ini");
			router.replace("/teacher/dashboard");
		}
	}, [router, session, sessionReady]);

	useEffect(() => {
		let cancelled = false;

		async function loadExams() {
			try {
				const res = await fetch("/api/admin/exams", { cache: "no-store" });
				const json = await res.json();
				const list: Exam[] = (json ?? [])
					.map((e: any) => ({
						id: String(e.id ?? ""),
						name: String(e.name ?? ""),
						academic_year: String(e.academic_year ?? ""),
					}))
					.filter((e: Exam) => Boolean(e.id));

				if (cancelled) return;
				setExams(list);
				if (!examId && list.length > 0) setExamId(list[0].id);
			} catch {
				if (!cancelled) setExams([]);
			}
		}

		loadExams();
		return () => {
			cancelled = true;
		};
	}, []);

	async function loadExisting() {
		if (!session || !examId) return;
		setLoading(true);
		try {
			const res = await fetch(
				`/api/teacher/report-cards/class?teacher_id=${session.user_id}&exam_id=${examId}`,
				{ cache: "no-store" },
			);
			const json = await res.json();
			if (!res.ok) {
				setStudents([]);
				setClassInfo(null);
				return;
			}
			setClassInfo(json?.class ?? null);
			setStudents(json?.students ?? []);
		} catch {
			setStudents([]);
			setClassInfo(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadExisting();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user_id, examId]);

	async function handleGenerateAllReports() {
		if (!session || !examId) return;

		setGenerating(true);
		const toastId = toast.loading("Menjana report card...");
		try {
			const res = await fetch("/api/teacher/report-cards/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ teacher_id: session.user_id, exam_id: examId }),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal jana report card", { id: toastId });
				return;
			}

			setClassInfo(json?.class ?? null);
			setStudents(json?.students ?? []);
			toast.success(
				`Report card berjaya dijana (${(json?.students ?? []).length} pelajar)`,
				{ id: toastId },
			);
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		} finally {
			setGenerating(false);
		}
	}

	async function handleSaveComment() {
		if (!session || !commentStudent || !classInfo || !examId) return;

		const toastId = toast.loading("Menyimpan comment...");
		try {
			const res = await fetch("/api/teacher/report-cards/comment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					student_id: commentStudent.student_id,
					class_id: classInfo.id,
					teacher_id: session.user_id,
					exam_id: examId,
					mode: "manual",
					comment: commentText,
				}),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal simpan comment", { id: toastId });
				return;
			}

			toast.success("Comment disimpan", { id: toastId });
			setStudents((prev) =>
				prev.map((s) =>
					s.student_id === commentStudent.student_id
						? { ...s, comment: commentText }
						: s,
				),
			);
			setCommentStudent(null);
			setCommentText("");
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	const approvedStatusLabel = useMemo(() => {
		if (!students.length) return "Belum dijana";
		return "Diluluskan";
	}, [students.length]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* ================= HEADER ================= */}
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-primary/10">
							<FileText className="w-6 h-6 text-primary" />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">Laporan Kelas</h1>
					</div>
					<p className="text-muted-foreground">
						Penjanaan slip keputusan pelajar berdasarkan markah yang telah diluluskan
					</p>
				</div>

				<Card className="shadow-lg border border-border/50">
					<CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2 w-fit overflow-auto">
							<div className="text-sm text-muted-foreground">Peperiksaan</div>
							<Select value={examId} onValueChange={setExamId}>
								<SelectTrigger>
									<SelectValue placeholder="Pilih peperiksaan" />
								</SelectTrigger>
								<SelectContent>
									{exams.map((e) => (
										<SelectItem key={e.id} value={e.id}>
											{e.name} ({e.academic_year})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="md:col-span-2 text-sm text-muted-foreground flex items-center">
							Jana report card hanya selepas semua markah untuk peperiksaan ini sudah{" "}
							<b>approved</b> oleh Penyelaras Subjek.
						</div>
					</CardContent>
				</Card>

				{/* ================= CLASS SUMMARY ================= */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Card className="shadow-lg border border-border/50">
						<CardContent className="p-6 flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Nama Kelas</p>
								<h3 className="text-xl font-semibold mt-2">{classInfo?.name ?? ""}</h3>
							</div>
							<Users className="w-6 h-6 text-primary" />
						</CardContent>
					</Card>

					<Card className="shadow-lg border border-border/50">
						<CardContent className="p-6 flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Status Markah</p>
								<h3 className="text-lg font-semibold mt-2 text-green-600">
									{approvedStatusLabel}
								</h3>
							</div>
							<CheckCircle className="w-6 h-6 text-green-600" />
						</CardContent>
					</Card>
				</div>

				{/* ================= BULK ACTION BUTTONS ================= */}
				<div className="flex flex-col justify-end gap-3 sm:flex-row">
					<Button
						onClick={handleGenerateAllReports}
						disabled={generating || loading || !examId}
					>
						<FileText className="w-4 h-4 mr-2" />
						{generating ? "Menjana..." : "Jana Report Card (Semua)"}
					</Button>
				</div>

				{/* ================= STUDENT REPORT ================= */}
				{students.map((student) => (
					<Card
						key={student.student_id}
						className="shadow-lg border border-border/50"
					>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>{student.student_name}</span>
								<Badge variant="secondary">Kedudukan {student.position ?? ""}</Badge>
							</CardTitle>
						</CardHeader>

						<CardContent className="space-y-4">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Subjek</TableHead>
										<TableHead className="text-center">Markah</TableHead>
										<TableHead className="text-center">Gred</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{student.subjects.map((sub, i) => (
										<TableRow key={i}>
											<TableCell>{sub.name}</TableCell>
											<TableCell className="text-center">{sub.mark}</TableCell>
											<TableCell className="text-center">{sub.grade}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							<p className="text-sm text-muted-foreground">
								<b>Purata:</b> {Math.round(student.average_mark || 0)}%
							</p>

							<div className="p-4 rounded-lg bg-muted/30 border">
								<p className="text-sm italic">
									{student.comment || "Comment belum diisi."}
								</p>
							</div>

							<div className="flex justify-end">
								<Button
									variant="outline"
									className="w-full sm:w-auto"
									onClick={() => {
										setCommentStudent(student);
										setCommentText(student.comment || "");
									}}
								>
									Comment (Manual)
								</Button>
							</div>
						</CardContent>
					</Card>
				))}

				{!loading && students.length === 0 && (
					<Card className="shadow-lg border border-border/50">
						<CardContent className="p-6 text-sm text-muted-foreground">
							Belum ada report card untuk peperiksaan ini. Klik{" "}
							<b>Jana Report Card (Semua)</b> selepas semua markah sudah approved.
						</CardContent>
					</Card>
				)}

				<Dialog
					open={Boolean(commentStudent)}
					onOpenChange={() => setCommentStudent(null)}
				>
					<DialogContent className="sm:max-w-[520px] rounded-xl">
						<DialogHeader>
							<DialogTitle>Comment Report Card</DialogTitle>
							<DialogDescription>
								Comment akan disimpan untuk pelajar ini bagi peperiksaan yang dipilih.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-2">
							<div className="text-sm text-muted-foreground">Pelajar</div>
							<div className="font-medium">{commentStudent?.student_name ?? ""}</div>
						</div>

						<div className="space-y-2">
							<div className="text-sm text-muted-foreground">Comment</div>
							<Input
								value={commentText}
								onChange={(e) => setCommentText(e.target.value)}
								placeholder="Tulis komen ringkas..."
							/>
						</div>

						<div className="flex flex-col justify-end gap-2 pt-2 sm:flex-row">
							<Button variant="outline" onClick={() => setCommentStudent(null)}>
								Batal
							</Button>
							<Button onClick={handleSaveComment} disabled={!commentText.trim()}>
								Simpan
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
