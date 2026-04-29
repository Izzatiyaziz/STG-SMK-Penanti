"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Users, ClipboardList, UserCheck, Download } from "lucide-react";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
};

type Subject = { id: string; name: string };
type Teacher = { id: string; name: string };
type ClassRow = { id: string; name: string; grade: number };
type Assignment = { id: string; teacher_id: string; class_id: string };

type CoordinatorAssignmentData = {
	subject: Subject | null;
	coordinator: { id: string; name: string } | null;
	classes: ClassRow[];
	teachers: Teacher[];
	assignments: Assignment[];
};

export default function SubjectCoordinatorAssignmentsPage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);

	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [selectedSubjectId, setSelectedSubjectId] = useState("");

	const [data, setData] = useState<CoordinatorAssignmentData | null>(null);
	const [loading, setLoading] = useState(false);
	const [savingClassId, setSavingClassId] = useState<string | null>(null);
	const [pendingTeacherByClass, setPendingTeacherByClass] = useState<
		Record<string, string>
	>({});

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
		if (role !== "subject coordinator") {
			toast.error("Anda tidak dibenarkan akses halaman ini");
			router.replace("/teacher/dashboard");
			return;
		}

		const teacherId = session.user_id;
		let cancelled = false;

		async function loadSubjects() {
			try {
				const res = await fetch(
					`/api/coordinator/subjects?teacher_id=${teacherId}`,
				);
				const json = await res.json();
				const list: Subject[] = (json?.data ?? [])
					.map((s: any) => ({
						id: String(s.id ?? ""),
						name: String(s.name ?? ""),
					}))
					.filter((s: Subject) => Boolean(s.id));

				if (cancelled) return;
				setSubjects(list);
				if (!selectedSubjectId && list.length > 0) setSelectedSubjectId(list[0].id);
			} catch {
				if (cancelled) return;
				setSubjects([]);
			}
		}

		loadSubjects();
		return () => {
			cancelled = true;
		};
	}, [router, session, sessionReady, selectedSubjectId]);

	useEffect(() => {
		if (!session || !selectedSubjectId) return;

		const teacherId = session.user_id;
		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/coordinator/teacher-subject?coordinator_teacher_id=${teacherId}&subject_id=${selectedSubjectId}`,
				);
				const json = (await res.json()) as CoordinatorAssignmentData;
				if (!res.ok) {
					toast.error((json as any)?.message ?? "Gagal memuatkan data");
					return;
				}
				if (cancelled) return;
				setData(json);
			} catch {
				if (!cancelled) setData(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [session, selectedSubjectId]);

	useEffect(() => {
		setPendingTeacherByClass({});
	}, [selectedSubjectId]);

	const assignmentTeacherByClassId = useMemo(() => {
		const out = new Map<string, string>();
		for (const a of data?.assignments ?? []) {
			if (!a?.class_id) continue;
			out.set(a.class_id, a.teacher_id);
		}
		return out;
	}, [data?.assignments]);

	const teacherNameById = useMemo(() => {
		const m = new Map<string, string>();
		for (const t of data?.teachers ?? []) m.set(t.id, t.name);
		return m;
	}, [data?.teachers]);

	async function saveAssignmentForClass(classId: string) {
		if (!session || !selectedSubjectId) return;

		const nextTeacherId = pendingTeacherByClass[classId] ?? "";
		setSavingClassId(classId);

		const toastId = toast.loading("Menyimpan assignment...");
		try {
			const res = await fetch("/api/coordinator/teacher-subject", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					coordinator_teacher_id: session.user_id,
					subject_id: selectedSubjectId,
					class_id: classId,
					teacher_id: nextTeacherId, // empty => unassign
				}),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal", { id: toastId });
				return;
			}

			toast.success("Disimpan", { id: toastId });
			setPendingTeacherByClass((prev) => {
				const next = { ...prev };
				delete next[classId];
				return next;
			});

			// reload latest assignments
			const reload = await fetch(
				`/api/coordinator/teacher-subject?coordinator_teacher_id=${session.user_id}&subject_id=${selectedSubjectId}`,
			);
			const reJson = (await reload.json()) as CoordinatorAssignmentData;
			if (reload.ok) setData(reJson);
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		} finally {
			setSavingClassId(null);
		}
	}

	if (!sessionReady) return null;
	if (!session) return null;

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* ================= HEADER ================= */}
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-primary/10">
							<ClipboardList className="w-6 h-6 text-primary" />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">
							Pengurusan Guru Subjek
						</h1>
					</div>
					<p className="text-muted-foreground">
						Assign guru mengikut kelas untuk subjek yang anda selaras
					</p>
				</div>

				{/* ================= SUBJECT PICKER ================= */}
				<Card className="shadow-lg border border-border/50">
					<CardContent className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Subjek Seliaan</p>
							<div className="flex w-full items-center gap-2">
								<Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
									<SelectTrigger className="w-full sm:max-w-[320px]">
										<SelectValue placeholder="Pilih subjek" />
									</SelectTrigger>
									<SelectContent>
										{subjects.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{subjects.length === 0 && (
								<p className="text-xs text-muted-foreground">
									Tiada subjek diset sebagai penyelaras untuk akaun ini.
								</p>
							)}
						</div>

						<div className="text-sm text-muted-foreground">
							{data?.coordinator?.name ? (
								<span className="inline-flex items-center gap-2">
									<UserCheck className="w-4 h-4 text-primary" />
									{data.coordinator.name}
								</span>
							) : null}
						</div>
					</CardContent>
				</Card>

				{/* ================= COORDINATOR INFO ================= */}
				<Card className="shadow-lg border border-border/50">
					<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
						<div className="min-w-0">
							<p className="text-sm text-muted-foreground">Subject Coordinator</p>
							<h3 className="mt-2 truncate text-xl font-semibold">
								{data?.coordinator?.name ?? ""}
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								Subjek: {data?.subject?.name ?? ""}
							</p>
						</div>
						<UserCheck className="w-6 h-6 text-primary" />
					</CardContent>
				</Card>

				{/* ================= ASSIGNMENT TABLE ================= */}
				<Card className="shadow-lg border border-border/50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="w-5 h-5 text-primary" />
							Assign Guru Mengikut Kelas
						</CardTitle>
					</CardHeader>

					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Tingkatan</TableHead>
									<TableHead>Kelas</TableHead>
									<TableHead>Guru Subjek</TableHead>
									<TableHead className="text-right">Tindakan</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{(data?.classes ?? []).map((cls) => {
									const assignedTeacherId = assignmentTeacherByClassId.get(cls.id) ?? "";
									const pendingTeacherId =
										pendingTeacherByClass[cls.id] ?? assignedTeacherId;
									const changed = pendingTeacherId !== assignedTeacherId;
									const saving = savingClassId === cls.id;

									return (
										<TableRow key={cls.id}>
											<TableCell className="font-medium">{cls.grade}</TableCell>

											<TableCell>{cls.name}</TableCell>

											<TableCell>
												<Select
													value={pendingTeacherId || "__none__"}
													onValueChange={(v) =>
														setPendingTeacherByClass((prev) => ({
															...prev,
															[cls.id]: v === "__none__" ? "" : v,
														}))
													}
													disabled={loading || saving || !selectedSubjectId}
												>
													<SelectTrigger className="w-full sm:max-w-[340px]">
														<SelectValue placeholder="Pilih guru" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="__none__">Tidak diassign</SelectItem>
														{(data?.teachers ?? []).map((t) => (
															<SelectItem key={t.id} value={t.id}>
																{t.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{assignedTeacherId && (
													<div className="text-xs text-muted-foreground mt-1">
														Current: {teacherNameById.get(assignedTeacherId) ?? ""}
													</div>
												)}
											</TableCell>

											<TableCell className="text-right">
												<Button
													size="sm"
													onClick={() => saveAssignmentForClass(cls.id)}
													disabled={!changed || saving || loading || !selectedSubjectId}
												>
													{saving ? "Menyimpan..." : "Simpan"}
												</Button>
											</TableCell>
										</TableRow>
									);
								})}

								{!loading && (data?.classes?.length ?? 0) === 0 && (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center text-muted-foreground py-10"
										>
											Tiada kelas.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* ================= ACTION ================= */}
				<div className="flex justify-end">
					<Button variant="outline" className="w-full sm:w-auto">
						<Download className="w-4 h-4 mr-2" />
						Export in PDF
					</Button>
				</div>
			</div>
		</div>
	);
}
