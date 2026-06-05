"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	CalendarDays,
	Clock,
	Edit,
	FileText,
	Filter,
	Plus,
	RefreshCw,
	Search,
	Settings,
	SortAsc,
	SortDesc,
	Trash2,
} from "lucide-react";

import { ExamItem } from "@/app/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
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
import {
	formatMalaysiaTime,
	getMalaysiaDateInputValue,
} from "@/lib/date-utils";

type SubjectOption = { id: string; name: string };
type SubjectExamSettings = {
	deadline?: string | null;
	objective_questions?: number | string | null;
	objective_max?: number | string | null;
	subjective_max?: number | string | null;
};
type ExamWithSettings = ExamItem & {
	subject_settings?: Record<string, SubjectExamSettings>;
};

const PAGE_SIZE = 8;

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();
const CURRENT_YEAR = String(new Date().getFullYear());

const LastUpdatedTime = () => {
	const [time, setTime] = useState("");

	useEffect(() => {
		const updateTime = () => {
			setTime(formatMalaysiaTime());
		};

		updateTime();
		const interval = setInterval(updateTime, 60000);
		return () => clearInterval(interval);
	}, []);

	return (
		<span className="font-medium text-primary">{time || "Memuatkan..."}</span>
	);
};

export default function ExamsPage() {
	const [exams, setExams] = useState<ExamWithSettings[]>([]);
	const [subjects, setSubjects] = useState<SubjectOption[]>([]);
	const [loading, setLoading] = useState(false);

	const [searchQuery, setSearchQuery] = useState("");
	const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [currentPage, setCurrentPage] = useState(1);

	const [addOpen, setAddOpen] = useState(false);
	const [editing, setEditing] = useState<ExamWithSettings | null>(null);
	const [deleting, setDeleting] = useState<ExamWithSettings | null>(null);
	const [settingExam, setSettingExam] = useState<ExamWithSettings | null>(null);

	const [selectedSubjectId, setSelectedSubjectId] = useState("");
	const [deadline, setDeadline] = useState("");
	const [objectiveQuestions, setObjectiveQuestions] = useState(40);
	const [objectiveMax, setObjectiveMax] = useState(40);
	const [subjectiveMax, setSubjectiveMax] = useState(60);

	async function fetchExams() {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/exams", { cache: "no-store" });
			const data = await res.json();
			setExams(Array.isArray(data) ? data : []);
		} catch {
			setExams([]);
			toast.error("Gagal memuatkan senarai peperiksaan");
		} finally {
			setLoading(false);
		}
	}

	async function fetchSubjects() {
		try {
			const res = await fetch("/api/admin/subjects", { cache: "no-store" });
			const data = await res.json();
			const list = Array.isArray(data) ? data : [];
			setSubjects(
				list
					.map((subject: { id?: unknown; name?: unknown }) => ({
						id: String(subject.id ?? ""),
						name: String(subject.name ?? ""),
					}))
					.filter((subject) => subject.id && subject.name),
			);
		} catch {
			setSubjects([]);
		}
	}

	useEffect(() => {
		void Promise.all([fetchExams(), fetchSubjects()]);
	}, []);

	const academicYears = useMemo(() => {
		return Array.from(
			new Set([
				CURRENT_YEAR,
				...exams.map((exam) => exam.academic_year).filter(Boolean),
			]),
		).sort((a, b) => b.localeCompare(a));
	}, [exams]);

	const filteredExams = useMemo(() => {
		const query = searchQuery.toLowerCase().trim();

		return exams
			.filter((exam) => {
				const matchesSearch =
					!query ||
					exam.name.toLowerCase().includes(query) ||
					exam.academic_year.toLowerCase().includes(query);
				const matchesYear =
					yearFilter === "all" || exam.academic_year === yearFilter;

				return matchesSearch && matchesYear;
			})
			.sort((a, b) =>
				sortOrder === "asc"
					? a.academic_year.localeCompare(b.academic_year) ||
						a.name.localeCompare(b.name)
					: b.academic_year.localeCompare(a.academic_year) ||
						a.name.localeCompare(b.name),
			);
	}, [exams, searchQuery, sortOrder, yearFilter]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, sortOrder, yearFilter]);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
		if (currentPage > totalPages) setCurrentPage(totalPages);
	}, [currentPage, filteredExams.length]);

	const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
	const paginatedExams = useMemo(() => {
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		return filteredExams.slice(startIndex, startIndex + PAGE_SIZE);
	}, [currentPage, filteredExams]);

	const paginationItems = useMemo(() => {
		if (totalPages <= 5)
			return Array.from({ length: totalPages }, (_, index) => index + 1);
		if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
		if (currentPage >= totalPages - 2) {
			return [
				1,
				"ellipsis",
				totalPages - 3,
				totalPages - 2,
				totalPages - 1,
				totalPages,
			] as const;
		}
		return [
			1,
			"ellipsis-left",
			currentPage - 1,
			currentPage,
			currentPage + 1,
			"ellipsis-right",
			totalPages,
		] as const;
	}, [currentPage, totalPages]);

	async function handleAddExam(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const formData = new FormData(form);
		const exam_name = normalizeSpaces(String(formData.get("exam_name") ?? ""));
		const academic_year = normalizeSpaces(
			String(formData.get("academic_year") ?? ""),
		);

		if (!exam_name || !academic_year) {
			toast.error("Nama peperiksaan dan tahun akademik diperlukan");
			return;
		}

		const toastId = toast.loading("Menambah peperiksaan...");
		try {
			const res = await fetch("/api/admin/exams", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ exam_name, academic_year }),
			});
			const data = await res.json();

			if (!res.ok) {
				toast.error(data.message || "Gagal menambah peperiksaan", { id: toastId });
				return;
			}

			toast.success("Peperiksaan berjaya ditambah", { id: toastId });
			form.reset();
			setAddOpen(false);
			await fetchExams();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	async function handleEditExam(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!editing) return;

		const formData = new FormData(e.currentTarget);
		const exam_name = normalizeSpaces(String(formData.get("exam_name") ?? ""));
		const academic_year = normalizeSpaces(
			String(formData.get("academic_year") ?? ""),
		);

		if (!exam_name || !academic_year) {
			toast.error("Nama peperiksaan dan tahun akademik diperlukan");
			return;
		}

		const toastId = toast.loading("Menyimpan perubahan...");
		try {
			const res = await fetch("/api/admin/exams", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					exam_id: editing.id,
					exam_name,
					academic_year,
				}),
			});
			const data = await res.json();

			if (!res.ok) {
				toast.error(data.message || "Gagal mengemas kini peperiksaan", {
					id: toastId,
				});
				return;
			}

			toast.success("Peperiksaan berjaya dikemas kini", { id: toastId });
			setEditing(null);
			await fetchExams();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	async function handleDeleteExam() {
		if (!deleting) return;

		const toastId = toast.loading("Memadam peperiksaan...");
		try {
			const res = await fetch(`/api/admin/exams?id=${deleting.id}`, {
				method: "DELETE",
			});
			const data = await res.json();

			if (!res.ok) {
				toast.error(data.message || "Gagal memadam peperiksaan", {
					id: toastId,
					duration: 7000,
				});
				return;
			}

			toast.success("Peperiksaan berjaya dipadam", { id: toastId });
			setDeleting(null);
			await fetchExams();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	function openSettings(exam: ExamWithSettings) {
		setSettingExam(exam);
		setSelectedSubjectId("");
		setDeadline("");
		setObjectiveQuestions(40);
		setObjectiveMax(40);
		setSubjectiveMax(60);
	}

	function loadSubjectSettings(
		exam: ExamWithSettings | null,
		subjectId: string,
	) {
		const settings = exam?.subject_settings ?? {};
		const subjectSettings = settings[subjectId] ?? null;
		setDeadline(String(subjectSettings?.deadline ?? ""));
		setObjectiveQuestions(Number(subjectSettings?.objective_questions ?? 40));
		setObjectiveMax(
			Number(
				subjectSettings?.objective_max ??
					Number(subjectSettings?.objective_questions ?? 40),
			),
		);
		setSubjectiveMax(Number(subjectSettings?.subjective_max ?? 60));
	}

	async function handleSaveSettings() {
		if (!settingExam || !selectedSubjectId) {
			toast.error("Sila pilih subjek");
			return;
		}

		const subject_settings = {
			...(settingExam.subject_settings ?? {}),
			[selectedSubjectId]: {
				deadline: deadline || null,
				objective_questions: Number(objectiveQuestions) || 0,
				objective_max: Number(objectiveMax) || 0,
				subjective_max: Number(subjectiveMax) || 0,
			},
		};

		const toastId = toast.loading("Menyimpan tetapan...");
		try {
			const res = await fetch("/api/admin/exams", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					exam_id: settingExam.id,
					subject_settings,
				}),
			});
			const data = await res.json();

			if (!res.ok) {
				toast.error(data.message || "Gagal menyimpan tetapan peperiksaan", {
					id: toastId,
				});
				return;
			}

			toast.success("Tetapan peperiksaan berjaya disimpan", { id: toastId });
			setSettingExam(null);
			await fetchExams();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	const clearFilters = () => {
		setSearchQuery("");
		setYearFilter(CURRENT_YEAR);
		setSortOrder("desc");
	};

	const hasFilters =
		Boolean(searchQuery.trim()) ||
		yearFilter !== CURRENT_YEAR ||
		sortOrder !== "desc";
	const fromItem =
		filteredExams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
	const toItem = Math.min(currentPage * PAGE_SIZE, filteredExams.length);

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			{/* PAGE HEADER */}
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
						Pentadbiran
					</p>
					<h1 className="!text-[36px] font-black leading-tight text-foreground">
						Peperiksaan
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => void Promise.all([fetchExams(), fetchSubjects()])}
						disabled={loading}
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
						<span className="ml-1.5">Muat Semula</span>
					</Button>
					<Dialog open={addOpen} onOpenChange={setAddOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								Tambah Peperiksaan
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-[500px]">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2 font-bold">
									<Plus className="h-5 w-5 text-primary" />
									Daftar Peperiksaan Baharu
								</DialogTitle>
								<DialogDescription>
									Masukkan nama peperiksaan dan tahun akademik yang berkaitan.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleAddExam} className="space-y-5 py-2">
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>Nama Peperiksaan</Label>
										<Input
											name="exam_name"
											placeholder="contoh: Peperiksaan Pertengahan Tahun"
											required
											className="h-11"
										/>
									</div>
									<div className="space-y-2">
										<Label>Tahun Akademik</Label>
										<Input
											name="academic_year"
											placeholder="contoh: 2026/2027"
											required
											className="h-11"
										/>
									</div>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setAddOpen(false)}
									>
										Batal
									</Button>
									<Button type="submit" disabled={loading} className="px-8">
										Simpan
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			<Card className="overflow-hidden border-border bg-card">
				<CardHeader className="border-b border-border/60 px-6 py-4">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-semibold text-foreground">
							Senarai Peperiksaan
						</CardTitle>
						<p className="text-xs text-muted-foreground">
							{filteredExams.length} peperiksaan dijumpai
						</p>
					</div>
				</CardHeader>

				<CardContent className="p-6">
					<div className="mb-6 flex flex-col gap-4 lg:flex-row">
						<div className="relative flex-1">
							<Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Cari peperiksaan..."
								className="h-11 rounded-lg border-border bg-background pl-10 focus:border-primary focus:ring-primary/20"
							/>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<div className="w-full sm:w-[200px]">
								<Select value={yearFilter} onValueChange={setYearFilter}>
									<SelectTrigger className="h-11 rounded-lg border-border bg-background">
										<SelectValue placeholder="Tahun Akademik" />
									</SelectTrigger>
									<SelectContent className="rounded-lg border-border">
										<SelectItem value="all">
											<div className="flex items-center gap-2">
												<CalendarDays className="h-4 w-4" />
												Tahun
											</div>
										</SelectItem>
										{academicYears.map((year) => (
											<SelectItem key={year} value={year}>
												{year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<Button
								variant="outline"
								onClick={clearFilters}
								disabled={!hasFilters}
								className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
							>
								Reset
							</Button>
						</div>
					</div>

					<div className="overflow-hidden rounded-lg border border-border">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-muted/30">
									<TableRow className="border-b border-border hover:bg-transparent">
										<TableHead className="w-16 py-4 text-center font-semibold text-foreground">
											#
										</TableHead>
										<TableHead className="py-4 font-semibold text-foreground">
											Nama Peperiksaan
										</TableHead>
										<TableHead className="py-4 font-semibold text-foreground">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
												}
												className="p-0 h-auto font-semibold hover:bg-transparent"
											>
												Tahun
												{sortOrder === "asc" ? (
													<SortAsc className="mr-2 h-4 w-4" />
												) : (
													<SortDesc className="mr-2 h-4 w-4" />
												)}
											</Button>
										</TableHead>
										<TableHead className="py-4 pr-6 text-right font-semibold text-foreground">
											Tindakan
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell colSpan={5} className="py-16">
												<div className="flex flex-col items-center justify-center gap-4">
													<RefreshCw className="h-10 w-10 animate-spin text-primary" />
													<div className="text-center">
														<p className="font-semibold text-foreground">
															Memuatkan data peperiksaan...
														</p>
														<p className="mt-1 text-sm text-muted-foreground">
															Sila tunggu sebentar
														</p>
													</div>
												</div>
											</TableCell>
										</TableRow>
									) : filteredExams.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="py-16">
												<div className="flex flex-col items-center justify-center gap-4">
													<div className="rounded-full bg-muted/50 p-4">
														<FileText className="h-12 w-12 text-muted-foreground/50" />
													</div>
													<div className="text-center">
														<p className="font-semibold text-foreground">
															Tiada peperiksaan dijumpai
														</p>
														<p className="mt-1 max-w-md text-sm text-muted-foreground">
															{hasFilters
																? "Tiada peperiksaan yang sepadan dengan carian anda"
																: "Mulakan dengan menambah peperiksaan pertama"}
														</p>
													</div>
													{!hasFilters && (
														<Button
															className="bg-primary text-primary-foreground hover:bg-primary/90"
															onClick={() => setAddOpen(true)}
														>
															<Plus className="mr-2 h-4 w-4" />
															Tambah Peperiksaan Pertama
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									) : (
										paginatedExams.map((exam, index) => {
											const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;

											return (
												<TableRow
													key={exam.id}
													className="group border-b border-border transition-colors last:border-0 hover:bg-muted/50"
												>
													<TableCell
														className="cursor-pointer py-4 text-center"
														onClick={() => openSettings(exam)}
													>
														<div className="font-medium text-muted-foreground transition-colors group-hover:text-primary">
															{displayIndex}
														</div>
													</TableCell>
													<TableCell className="cursor-pointer py-4">
														<div className="flex items-center gap-3">
															<div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
																<span className="text-sm font-semibold text-primary">
																	{exam.name.charAt(0)}
																</span>
															</div>
															<div>
																<div className="font-semibold text-foreground transition-colors group-hover:text-primary">
																	{exam.name}
																</div>
															</div>
														</div>
													</TableCell>
													<TableCell className="py-4">
														<Badge
															variant="outline"
															className="border-border/60 text-muted-foreground"
														>
															{exam.academic_year}
														</Badge>
													</TableCell>
													<TableCell className="py-4 pr-6 text-right">
														<div className="flex justify-end gap-2">
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-blue-600"
																onClick={() => setEditing(exam)}
																title="Kemaskini peperiksaan"
																aria-label="Kemaskini peperiksaan"
															>
																<Edit className="h-4 w-4" />
															</Button>
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-rose-600"
																onClick={() => setDeleting(exam)}
																title="Padam peperiksaan"
																aria-label="Padam peperiksaan"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
					</div>
				</CardContent>

				<div className="border-t border-border bg-muted/20 px-6 py-4">
					<div className="flex flex-col gap-4 text-sm">
						<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
							<div className="flex flex-wrap items-center justify-center gap-2 text-muted-foreground sm:justify-start">
								<span>Menunjukkan</span>
								<span className="font-semibold text-foreground">
									{fromItem} - {toItem}
								</span>
								<span>daripada</span>
								<span className="font-semibold text-foreground">{exams.length}</span>
								<span>peperiksaan</span>
								{yearFilter !== "all" && (
									<Badge variant="secondary" className="ml-1">
										{yearFilter}
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Clock className="h-4 w-4" />
									<span>
										Kemas kini: <LastUpdatedTime />
									</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => void fetchExams()}
									disabled={loading}
									className="h-8"
								>
									{loading && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
									Muat Semula Data
								</Button>
							</div>
						</div>

						{!loading && totalPages > 1 && (
							<div className="border-t border-border/60 pt-4">
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												href="#"
												onClick={(e) => {
													e.preventDefault();
													setCurrentPage((page) => Math.max(1, page - 1));
												}}
												className={
													currentPage === 1 ? "pointer-events-none opacity-50" : undefined
												}
											/>
										</PaginationItem>

										{paginationItems.map((item, idx) => {
											if (typeof item !== "number") {
												return (
													<PaginationItem key={`${item}-${idx}`}>
														<PaginationEllipsis />
													</PaginationItem>
												);
											}

											return (
												<PaginationItem key={item}>
													<PaginationLink
														href="#"
														isActive={currentPage === item}
														onClick={(e) => {
															e.preventDefault();
															setCurrentPage(item);
														}}
													>
														{item}
													</PaginationLink>
												</PaginationItem>
											);
										})}

										<PaginationItem>
											<PaginationNext
												href="#"
												onClick={(e) => {
													e.preventDefault();
													setCurrentPage((page) => Math.min(totalPages, page + 1));
												}}
												className={
													currentPage === totalPages
														? "pointer-events-none opacity-50"
														: undefined
												}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						)}
					</div>
				</div>
			</Card>

			<Dialog
				open={Boolean(editing)}
				onOpenChange={(open) => !open && setEditing(null)}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<Edit className="h-5 w-5 text-primary" />
							Kemaskini Peperiksaan
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleEditExam} className="space-y-5 py-4">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Nama Peperiksaan</Label>
								<Input
									name="exam_name"
									defaultValue={editing?.name}
									required
									className="h-11"
								/>
							</div>
							<div className="space-y-2">
								<Label>Tahun Akademik</Label>
								<Input
									name="academic_year"
									defaultValue={editing?.academic_year}
									required
									className="h-11"
								/>
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setEditing(null)}>
								Batal
							</Button>
							<Button type="submit" className="px-8">
								Simpan
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(deleting)}
				onOpenChange={(open) => !open && setDeleting(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-bold text-destructive">
							Padam Peperiksaan?
						</DialogTitle>
						<DialogDescription>
							Padam rekod <strong>{deleting?.name}</strong>? Data berkaitan peperiksaan
							ini juga akan dipadam.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleting(null)}>
							Batal
						</Button>
						<Button variant="destructive" onClick={handleDeleteExam}>
							Ya, Padam
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(settingExam)}
				onOpenChange={(open) => !open && setSettingExam(null)}
			>
				<DialogContent className="sm:max-w-[640px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<Settings className="h-5 w-5 text-primary" />
							Tetapan Peperiksaan Mengikut Subjek
						</DialogTitle>
						<DialogDescription>
							Tetapkan tarikh akhir hantar markah serta had markah objektif dan
							subjektif.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-5 py-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label className="text-muted-foreground">Peperiksaan</Label>
								<div className="flex h-11 items-center rounded-md border border-border bg-muted/30 px-3 font-medium">
									{settingExam?.name}
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-muted-foreground">Tahun Akademik</Label>
								<div className="flex h-11 items-center rounded-md border border-border bg-muted/30 px-3 font-medium">
									{settingExam?.academic_year}
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Subjek</Label>
							<Select
								value={selectedSubjectId}
								onValueChange={(value) => {
									setSelectedSubjectId(value);
									loadSubjectSettings(settingExam, value);
								}}
							>
								<SelectTrigger className="h-11">
									<SelectValue placeholder="Pilih subjek" />
								</SelectTrigger>
								<SelectContent>
									{subjects.length === 0 ? (
										<SelectItem value="none" disabled>
											Tiada subjek ditemui
										</SelectItem>
									) : (
										subjects.map((subject) => (
											<SelectItem key={subject.id} value={subject.id}>
												{subject.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Tarikh Akhir</Label>
							<Input
								type="date"
								value={deadline}
								onChange={(e) => setDeadline(e.target.value)}
								min={getMalaysiaDateInputValue()}
								className="h-11"
							/>
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							<div className="space-y-2">
								<Label>Bil. Soalan Objektif</Label>
								<Input
									type="number"
									min={0}
									value={objectiveQuestions}
									onChange={(e) => setObjectiveQuestions(Number(e.target.value))}
									className="h-11"
								/>
							</div>
							<div className="space-y-2">
								<Label>Max Objektif</Label>
								<Input
									type="number"
									min={0}
									value={objectiveMax}
									onChange={(e) => setObjectiveMax(Number(e.target.value))}
									className="h-11"
								/>
							</div>
							<div className="space-y-2">
								<Label>Max Subjektif</Label>
								<Input
									type="number"
									min={0}
									value={subjectiveMax}
									onChange={(e) => setSubjectiveMax(Number(e.target.value))}
									className="h-11"
								/>
							</div>
						</div>

						<div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
							<p className="text-[11px] leading-relaxed text-amber-700">
								<strong>Nota:</strong> Tetapan ini digunakan oleh guru ketika merekod
								markah peperiksaan untuk subjek yang dipilih.
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setSettingExam(null)}>
							Batal
						</Button>
						<Button
							onClick={handleSaveSettings}
							disabled={!selectedSubjectId}
							className="px-8"
						>
							Simpan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
