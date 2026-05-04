"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Building2,
	Clock,
	Download,
	GraduationCap,
	Loader2,
	RefreshCw,
	Search,
	Shield,
	Trash2,
	UserPlus,
	Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
			setTime(
				new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			);
		};

		update();
		const interval = window.setInterval(update, 60000);
		return () => window.clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
}

function formatDate(dateString?: string | null) {
	if (!dateString) return "-";
	try {
		return new Date(dateString).toLocaleDateString("ms-MY", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return "-";
	}
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

	async function handleAddStudent(studentId: string) {
		if (!classInfo) return;

		setActionLoading(true);
		try {
			const res = await fetch("/api/teacher/my-class/add", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ studentId, classId: classInfo.id }),
			});

			if (!res.ok) throw new Error();
			toast.success("Pelajar berjaya ditambah ke kelas");
			await fetchData({ silent: true });
			await fetchAvailableStudents();
		} catch {
			toast.error("Ralat semasa menambah pelajar");
		} finally {
			setActionLoading(false);
		}
	}

	async function handleRemoveStudent(studentId: string) {
		if (!confirm("Adakah anda pasti mahu mengeluarkan pelajar ini dari kelas?")) {
			return;
		}

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

	const filteredAvailableStudents = availableStudents.filter((student) => {
		const query = searchQuery.toLowerCase();
		return (
			student.name.toLowerCase().includes(query) ||
			student.identifier.includes(searchQuery)
		);
	});

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="text-center space-y-4">
					<Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
					<p className="text-muted-foreground font-medium animate-pulse">
						Memuatkan maklumat kelas...
					</p>
				</div>
			</div>
		);
	}

	if (!classInfo) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6">
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
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
								<Users className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-foreground">
									Pengurusan Pelajar Kelas
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Tingkatan {classInfo.grade} | Guru Kelas:{" "}
									<span className="text-primary font-bold">
										{classInfo.name}
									</span>
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Shield className="w-3.5 h-3.5" />
								<span>Data Kelas Terkawal</span>
							</div>
							<div className="w-1 h-1 rounded-full bg-muted" />
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>
									Kemas kini: <LastUpdatedTime />
								</span>
							</div>
						</div>
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
							<DialogContent className="sm:max-w-[520px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
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
													<TableRow
														key={student.id}
														className="hover:bg-muted/50 transition-colors"
													>
														<TableCell className="py-4">
															<div className="flex items-center gap-3">
																<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
																	<span className="font-semibold text-primary text-sm">
																		{student.name.charAt(0)}
																	</span>
																</div>
																<div>
																	<div className="font-semibold">{student.name}</div>
																	<span className="font-mono bg-muted/30 px-2 py-1 rounded-md text-xs text-muted-foreground">
																		{student.identifier}
																	</span>
																</div>
															</div>
														</TableCell>
														<TableCell className="py-4 text-right">
															<Button
																size="sm"
																onClick={() => handleAddStudent(student.id)}
																disabled={actionLoading}
															>
																{actionLoading ? (
																	<Loader2 className="w-4 h-4 animate-spin" />
																) : (
																	"Tambah"
																)}
															</Button>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					<SummaryCard
						label="Jumlah Pelajar"
						value={students.length}
						icon={Users}
						tone="primary"
					/>
					<SummaryCard
						label="Nama Kelas"
						value={classInfo.name}
						icon={Building2}
						tone="emerald"
					/>
					<SummaryCard
						label="Tingkatan"
						value={`Tingkatan ${classInfo.grade}`}
						icon={GraduationCap}
						tone="blue"
					/>
				</div>

				<Card className="border-border bg-card shadow-lg overflow-hidden">
					<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
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
							<Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
								{students.length} PELAJAR
							</Badge>
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
															onClick={() => handleRemoveStudent(student.id)}
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
			</div>

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
