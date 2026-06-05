"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Building2,
	Clock,
	Download,
	GraduationCap,
	Loader2,
	Plus,
	RefreshCw,
	Search,
	Shield,
	Trash2,
	UserPlus,
	Users,
	Filter,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatMalaysiaDate, formatMalaysiaTime } from "@/lib/date-utils";

type Student = {
	id: string;
	name: string;
	identifier: string;
	level?: string | null;
	enrollment_date?: string | null;
};

type ClassInfo = {
	id: string;
	name: string;
	grade: string;
};

type ClassTeacherResponse = {
	class: ClassInfo | null;
	students: Student[];
};

function LastUpdatedTime() {
	const [time, setTime] = useState("");

	useEffect(() => {
		const update = () => {
			setTime(formatMalaysiaTime());
		};

		update();
		const interval = window.setInterval(update, 60000);
		return () => window.clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
}

function formatDate(dateString?: string | null) {
	return formatMalaysiaDate(dateString);
}

export default function MyClassPage() {
	const [teacherId, setTeacherId] = useState("");
	const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
	const [students, setStudents] = useState<Student[]>([]);
	const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [selectedAvailableStudentIds, setSelectedAvailableStudentIds] = useState<
		Set<string>
	>(new Set());
	const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
	const [bulkAdding, setBulkAdding] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
	const [removingStudent, setRemovingStudent] = useState(false);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("stg_session");
			if (!raw) return;
			const parsed = JSON.parse(raw);
			if (parsed?.userType === "teacher" && parsed?.user_id) {
				setTeacherId(parsed.user_id);
			}
		} catch {
			// ignore invalid session payload
		}
	}, []);

	const fetchData = useCallback(
		async (options?: { silent?: boolean }) => {
			if (!teacherId) return;
			if (!options?.silent) setLoading(true);

			try {
				const res = await fetch(
					`/api/teacher/class-teacher?teacher_id=${teacherId}`,
				);
				const data = (await res.json()) as ClassTeacherResponse;
				if (!res.ok) {
					toast.error((data as { error?: string }).error || "Gagal memuatkan data");
					setClassInfo(null);
					setStudents([]);
					return;
				}

				setClassInfo(data.class);
				setStudents(Array.isArray(data.students) ? data.students : []);
			} catch {
				toast.error("Ralat sistem semasa memuatkan data");
				setClassInfo(null);
				setStudents([]);
			} finally {
				setLoading(false);
			}
		},
		[teacherId],
	);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	async function fetchAvailableStudents() {
		if (!classInfo) return;

		setSelectedAvailableStudentIds(new Set());
		setSearchQuery("");
		try {
			const res = await fetch(
				`/api/teacher/available-students?grade=${classInfo.grade}`,
			);
			const data: unknown = await res.json();
			setAvailableStudents(Array.isArray(data) ? (data as Student[]) : []);
		} catch {
			setAvailableStudents([]);
			toast.error("Gagal memuatkan senarai pelajar tersedia");
		}
	}

	useEffect(() => {
		setSelectedAvailableStudentIds((previous) => {
			if (previous.size === 0) return previous;
			const availableIds = new Set(availableStudents.map((student) => student.id));
			const next = new Set<string>();
			for (const id of previous) {
				if (availableIds.has(id)) next.add(id);
			}
			return next;
		});
	}, [availableStudents]);

	async function handleRefresh() {
		await fetchData({ silent: true });
		toast.success("Senarai pelajar dikemas kini");
	}

	function handleExport() {
		const header = ["Nama Pelajar", "No. Kad Pengenalan", "Tingkatan", "Kelas", "Tarikh Daftar"];
		const body = students.map((student) => [
			student.name,
			student.identifier,
			student.level || classInfo?.grade || "",
			classInfo?.name || "",
			formatDate(student.enrollment_date),
		]);
		const csv = [header, ...body]
			.map((row) =>
				row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
			)
			.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${classInfo?.name || "kelas"}-pelajar.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
		toast.success("Data pelajar berjaya dieksport");
	}

	async function addStudentToClass(studentId: string) {
		if (!classInfo) return false;
		const res = await fetch("/api/teacher/my-class/add", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ studentId, classId: classInfo.id }),
		});
		return res.ok;
	}

	async function handleAddStudent(studentId: string) {
		if (!classInfo) return;

		setActionLoading(true);
		setAddingStudentId(studentId);
		setBulkAdding(false);
		try {
			const ok = await addStudentToClass(studentId);
			if (!ok) throw new Error();
			toast.success("Pelajar berjaya ditambah ke kelas");
			await fetchData({ silent: true });
			await fetchAvailableStudents();
		} catch {
			toast.error("Ralat semasa menambah pelajar");
		} finally {
			setActionLoading(false);
			setAddingStudentId(null);
		}
	}

	async function handleAddSelectedStudents() {
		if (!classInfo) return;
		const ids = Array.from(selectedAvailableStudentIds);
		if (ids.length === 0) return;

		setActionLoading(true);
		setAddingStudentId(null);
		setBulkAdding(true);
		try {
			let successCount = 0;
			let failedCount = 0;
			for (const id of ids) {
				const ok = await addStudentToClass(id);
				if (ok) successCount += 1;
				else failedCount += 1;
			}

			if (successCount > 0) {
				toast.success(`Berjaya tambah ${successCount} pelajar ke kelas`);
			}
			if (failedCount > 0) {
				toast.error(`Gagal tambah ${failedCount} pelajar`);
			}

			setSelectedAvailableStudentIds(new Set());
			await fetchData({ silent: true });
			await fetchAvailableStudents();
		} catch {
			toast.error("Ralat semasa menambah pelajar");
		} finally {
			setActionLoading(false);
			setBulkAdding(false);
		}
	}

	async function handleRemoveStudent(studentId: string) {
		try {
			const res = await fetch(
				`/api/teacher/my-class/remove?studentId=${studentId}`,
				{ method: "DELETE" },
			);
			if (!res.ok) throw new Error();
			toast.success("Pelajar telah dikeluarkan");
			await fetchData({ silent: true });
		} catch {
			toast.error("Gagal mengeluarkan pelajar");
		}
	}

	async function confirmRemoveStudent() {
		if (!studentToRemove) return;

		setRemovingStudent(true);
		try {
			await handleRemoveStudent(studentToRemove.id);
			setRemoveOpen(false);
			setStudentToRemove(null);
		} finally {
			setRemovingStudent(false);
		}
	}

	const filteredAvailableStudents = availableStudents.filter((student) => {
		const query = searchQuery.toLowerCase();
		return (
			student.name.toLowerCase().includes(query) ||
			student.identifier.includes(searchQuery)
		);
	});

	const visibleAvailableStudentIds = filteredAvailableStudents.map(
		(student) => student.id,
	);
	const selectedVisibleCount = visibleAvailableStudentIds.reduce((count, id) => {
		return selectedAvailableStudentIds.has(id) ? count + 1 : count;
	}, 0);
	const selectAllChecked =
		visibleAvailableStudentIds.length > 0 &&
		selectedVisibleCount === visibleAvailableStudentIds.length;
	const selectAllIndeterminate =
		selectedVisibleCount > 0 && selectedVisibleCount < visibleAvailableStudentIds.length;

	function toggleSelectAllVisible() {
		setSelectedAvailableStudentIds((previous) => {
			if (visibleAvailableStudentIds.length === 0) return previous;

			const next = new Set(previous);
			if (selectAllChecked) {
				for (const id of visibleAvailableStudentIds) next.delete(id);
				return next;
			}

			for (const id of visibleAvailableStudentIds) next.add(id);
			return next;
		});
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
				<Loader2 className="h-5 w-5 animate-spin text-primary" />
				<span className="text-sm">Memuatkan maklumat kelas...</span>
			</div>
		);
	}

	if (!classInfo) {
		return (
			<div className="flex flex-col gap-8 p-6 md:p-8">
				<Card className="max-w-md w-full border-dashed border-2">
					<CardContent className="pt-10 pb-10 text-center space-y-4">
						<div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
							<Shield className="w-8 h-8" />
						</div>
						<h2 className="text-xl font-bold">Akses Terhad</h2>
						<p className="text-muted-foreground text-sm">
							Anda belum ditetapkan sebagai Guru Kelas oleh pihak pentadbir.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/40 pb-6">
				<div className="flex flex-col gap-1">
					<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">Guru Kelas</p>
					<h1 className="!text-[36px] font-black leading-tight text-foreground">Pengurusan Pelajar</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Tingkatan {classInfo.grade} · Kelas{" "}
						<span className="font-semibold text-foreground">{classInfo.name}</span>
						{" "}· Kemas kini: <LastUpdatedTime />
					</p>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button
							variant="outline"
							onClick={handleRefresh}
							disabled={loading}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							{loading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4 mr-2" />
							)}
							Muat Semula
						</Button>

						<Button
							variant="outline"
							onClick={handleExport}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							<Download className="w-4 h-4 mr-2" />
							Eksport
						</Button>

						<Dialog>
							<DialogTrigger asChild>
								<Button
									onClick={fetchAvailableStudents}
									className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
								>
									<UserPlus className="w-4 h-4 mr-2" />
									Tambah Pelajar
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[600px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
								<DialogHeader className="space-y-3">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-xl bg-primary/10">
											<GraduationCap className="w-6 h-6 text-primary" />
										</div>
										<DialogTitle className="text-xl font-bold text-foreground">
											Tambah Pelajar Kelas
										</DialogTitle>
									</div>
									<DialogDescription>
										Pilih pelajar Tingkatan {classInfo.grade} yang belum mempunyai
										kelas.
									</DialogDescription>
								</DialogHeader>

								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="Cari nama atau IC..."
										className="h-11 rounded-xl border-2 border-border/30 pl-9"
										value={searchQuery}
										onChange={(event) => setSearchQuery(event.target.value)}
									/>
								</div>

								<div className="flex items-center justify-between gap-3">
									<button
										type="button"
										className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
										onClick={toggleSelectAllVisible}
										disabled={actionLoading || visibleAvailableStudentIds.length === 0}
									>
										<Checkbox
											checked={
												selectAllIndeterminate ? "indeterminate" : selectAllChecked
											}
											aria-label="Pilih semua pelajar yang dipaparkan"
										/>
										<span>
											Pilih semua{" "}
											{visibleAvailableStudentIds.length > 0
												? `(${selectedVisibleCount}/${visibleAvailableStudentIds.length})`
												: ""}
										</span>
									</button>

									<Button
										size="sm"
										variant="outline"
										onClick={handleAddSelectedStudents}
										disabled={actionLoading || selectedAvailableStudentIds.size === 0}
										className="gap-2"
									>
										{actionLoading && bulkAdding ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<UserPlus className="w-4 h-4" />
										)}
										Tambah ({selectedAvailableStudentIds.size})
									</Button>
								</div>

								<div className="max-h-[360px] overflow-y-auto rounded-lg border border-border">
									<Table>
										<TableBody>
											{filteredAvailableStudents.length === 0 ? (
												<TableRow>
													<TableCell className="py-12 text-center text-sm text-muted-foreground">
														Tiada pelajar tersedia dijumpai.
													</TableCell>
												</TableRow>
											) : (
												filteredAvailableStudents.map((student) => (
													(() => {
														const isSelected = selectedAvailableStudentIds.has(student.id);
														const toggleSelected = () => {
															if (actionLoading) return;
															setSelectedAvailableStudentIds((previous) => {
																const next = new Set(previous);
																if (next.has(student.id)) next.delete(student.id);
																else next.add(student.id);
																return next;
															});
														};

														return (
													<TableRow
														key={student.id}
														className="hover:bg-muted/50 transition-colors cursor-pointer"
														onClick={(e) => {
															const target = e.target as HTMLElement | null;
															if (
																target?.closest("button") ||
																target?.closest("a") ||
																target?.closest("input") ||
																target?.closest("[role='checkbox']")
															) {
																return;
															}
															toggleSelected();
														}}
													>
														<TableCell className="py-4 whitespace-normal align-top">
															<div className="flex items-center gap-3">
																<Checkbox
																	checked={isSelected}
																	aria-label={`Pilih ${student.name}`}
																	disabled={actionLoading}
																	onClick={(e) => e.stopPropagation()}
																	onCheckedChange={(checked) => {
																		setSelectedAvailableStudentIds((previous) => {
																			const next = new Set(previous);
																			if (checked) next.add(student.id);
																			else next.delete(student.id);
																			return next;
																		});
																	}}
																/>
																<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
																	<span className="font-semibold text-primary text-sm">
																		{student.name.charAt(0)}
																	</span>
																</div>
																<div className="min-w-0">
																	<div className="font-semibold whitespace-normal break-words leading-snug">
																		{student.name}
																	</div>
																	<span className="font-mono bg-muted/30 px-2 py-1 rounded-md text-xs text-muted-foreground">
																		{student.identifier}
																	</span>
																</div>
															</div>
														</TableCell>
													</TableRow>
														);
													})()
												))
											)}
										</TableBody>
									</Table>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<Card className="border-border bg-card shadow-sm overflow-hidden">
					<CardHeader className="border-b border-border px-6 py-5">
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<CardTitle className="text-xl font-bold flex items-center gap-2">
									<Users className="w-5 h-5 text-primary" />
									Senarai Pelajar Kelas
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Klik nama pelajar untuk lihat maklumat pelajar
								</p>
							</div>
							<div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                                    <Filter className="w-3 h-3 mr-1" />
								{students.length} pelajar
							</Badge>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-6">
						<div className="rounded-lg border border-border overflow-hidden">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader className="bg-muted/30">
										<TableRow className="hover:bg-transparent border-b border-border">
											<TableHead className="font-semibold text-foreground py-4 w-16 text-center">
												#
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Nama Pelajar
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												No. Kad Pengenalan
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-right pr-6">
												Tindakan
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{students.length === 0 ? (
											<TableRow>
												<TableCell colSpan={4} className="py-16">
													<div className="flex flex-col items-center justify-center gap-4">
														<div className="p-4 rounded-full bg-muted/50">
															<Users className="w-12 h-12 text-muted-foreground/50" />
														</div>
														<p className="font-semibold text-foreground">
															Tiada pelajar dijumpai
														</p>
													</div>
												</TableCell>
											</TableRow>
										) : (
											students.map((student, index) => (
												<TableRow
													key={student.id}
													className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
												>
													<TableCell className="py-4 text-center">
														{index + 1}
													</TableCell>
													<TableCell className="py-4">
														<button
															type="button"
															className="flex items-center gap-3 text-left"
															onClick={() => setSelectedStudent(student)}
														>
															<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
																<span className="font-semibold text-primary text-sm">
																	{student.name.charAt(0)}
																</span>
															</div>
															<span className="font-semibold hover:text-primary">
																{student.name}
															</span>
														</button>
													</TableCell>
													<TableCell className="py-4">
														<span className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-sm">
															{student.identifier}
														</span>
													</TableCell>
													<TableCell className="py-4 text-right pr-6">
														<Button
															size="icon"
															variant="outline"
															className="h-8 w-8 text-rose-600"
															onClick={() => {
																setStudentToRemove(student);
																setRemoveOpen(true);
															}}
															title="Keluarkan pelajar"
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					</CardContent>
				</Card>

			<AlertDialog
				open={removeOpen}
				onOpenChange={(open) => {
					setRemoveOpen(open);
					if (!open) setStudentToRemove(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-destructive font-bold">
							Keluarkan Pelajar?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Keluarkan{" "}
							<span className="font-semibold text-foreground">
								{studentToRemove?.name}
							</span>{" "}
							dari kelas ini?
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={removingStudent}>
							Batal
						</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								variant="destructive"
								onClick={(event) => {
									event.preventDefault();
									confirmRemoveStudent();
								}}
								disabled={removingStudent}
							>
								{removingStudent && (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								)}
								{removingStudent ? "Mengeluarkan..." : "Ya, Keluarkan"}
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				open={Boolean(selectedStudent)}
				onOpenChange={(open) => {
					if (!open) setSelectedStudent(null);
				}}
			>
				<DialogContent className="sm:max-w-[460px]">
					<DialogHeader>
						<DialogTitle>Maklumat Pelajar</DialogTitle>
						<DialogDescription>
							Maklumat ini hanya untuk paparan dan tidak boleh diedit.
						</DialogDescription>
					</DialogHeader>
					{selectedStudent && (
						<div className="space-y-3 py-2">
							<InfoRow label="Nama Pelajar" value={selectedStudent.name} />
							<InfoRow
								label="Tingkatan"
								value={`Tingkatan ${selectedStudent.level || classInfo.grade || "-"}`}
							/>
							<InfoRow label="Kelas" value={classInfo.name || "-"} />
							<InfoRow
								label="Tarikh Daftar"
								value={formatDate(selectedStudent.enrollment_date)}
							/>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	icon: Icon,
	tone,
}: {
	label: string;
	value: string | number;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	tone: "primary" | "emerald" | "blue";
}) {
	const toneClass =
		tone === "emerald"
			? "text-emerald-600 bg-emerald-100 border-emerald-200"
			: tone === "blue"
				? "text-blue-600 bg-blue-100 border-blue-200"
				: "text-primary bg-primary/10 border-primary/20";

	return (
		<Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
			<CardContent className="p-5">
				<div className="flex items-start justify-between">
					<div className="min-w-0 pr-4">
						<p className="text-sm font-medium text-muted-foreground mb-2">
							{label}
						</p>
						<h3 className="text-3xl font-bold text-foreground truncate">
							{value}
						</h3>
					</div>
					<div className={`p-3 rounded-xl border ${toneClass}`}>
						<Icon className="w-5 h-5" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 font-semibold text-foreground">{value}</p>
		</div>
	);
}
