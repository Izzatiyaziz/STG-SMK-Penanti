"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
	Plus,
	Trash2,
	Edit,
	UserPlus,
	UserMinus,
	Search,
	RefreshCw,
	BookOpen,
	Users,
	Clock,
	Filter,
	X,
	Loader2,
	SortAsc,
	SortDesc,
	AlertCircle,
} from "lucide-react";
import { formatMalaysiaTime } from "@/lib/date-utils";

type SubjectRow = {
	id: string;
	name: string;
	coordinator: { id: string; name: string } | null;
};

type TeacherRow = {
	id: string;
	name: string;
	identifier?: string;
	roles?: string[];
};

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();
const isWordsOnlyName = (value: string) => {
	const normalized = normalizeSpaces(value);
	if (!normalized) return false;
	return /^[\p{L}]+(?:[/'’][\p{L}]+)*(?: [\p{L}]+(?:[/'’][\p{L}]+)*)*$/u.test(
		normalized,
	);
};

// Client-side only time component
const LastUpdatedTime = () => {
	const [time, setTime] = useState<string>(() => formatMalaysiaTime());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(formatMalaysiaTime());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	return (
		<span className="font-medium text-primary">{time || "Memuatkan..."}</span>
	);
};

export default function AdminSubjectsPage() {
	const PAGE_SIZE = 8;
	const [rows, setRows] = useState<SubjectRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [currentPage, setCurrentPage] = useState(1);
	const [addOpen, setAddOpen] = useState(false);
	const [addName, setAddName] = useState("");
	const [addNameTouched, setAddNameTouched] = useState(false);

	const [editing, setEditing] = useState<SubjectRow | null>(null);
	const [editName, setEditName] = useState("");
	const [editNameTouched, setEditNameTouched] = useState(false);
	const [deleting, setDeleting] = useState<SubjectRow | null>(null);

	const [teachers, setTeachers] = useState<TeacherRow[]>([]);
	const [assigning, setAssigning] = useState<SubjectRow | null>(null);
	const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
	const [assignLoading, setAssignLoading] = useState(false);
	const [isChangingCoordinator, setIsChangingCoordinator] = useState(false);

	const editNameNormalized = normalizeSpaces(editName);
	const editNameError =
		editNameTouched && !editNameNormalized
			? "Nama subjek diperlukan."
			: editNameTouched &&
				  editNameNormalized &&
				  !isWordsOnlyName(editNameNormalized)
				? "Nama subjek hanya boleh mengandungi huruf, ruang, '/' dan apostrof (')"
				: "";
	const editNameIsValid =
		Boolean(editNameNormalized) && isWordsOnlyName(editNameNormalized);

	const addNameNormalized = normalizeSpaces(addName);
	const addNameError =
		addNameTouched && !addNameNormalized
			? "Nama subjek diperlukan."
			: addNameTouched && addNameNormalized && !isWordsOnlyName(addNameNormalized)
				? "Nama subjek hanya boleh mengandungi huruf, ruang, '/' dan apostrof (')"
				: "";
	const addNameIsValid =
		Boolean(addNameNormalized) && isWordsOnlyName(addNameNormalized);

	async function fetchSubjects() {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/subjects");
			const data = await res.json();
			setRows(data ?? []);
		} catch {
			setRows([]);
		} finally {
			setLoading(false);
		}
	}

	async function fetchTeachers() {
		try {
			const res = await fetch("/api/admin/users?role=teacher");
			const data = await res.json();
			const list = Array.isArray(data) ? data : [];

			const options: TeacherRow[] = [];
			for (const item of list) {
				if (!item || typeof item !== "object") continue;
				const id = String((item as { id?: unknown }).id ?? "").trim();
				const name = String((item as { name?: unknown }).name ?? "").trim();
				const rolesRaw = (item as { roles?: unknown }).roles;
				const roles = Array.isArray(rolesRaw)
					? rolesRaw.map((role) => String(role))
					: [];
				if (!id || !name) continue;
				options.push({
					id,
					name,
					identifier: (item as { identifier?: unknown }).identifier as
						| string
						| undefined,
					roles,
				});
			}
			setTeachers(options);
		} catch {
			setTeachers([]);
		}
	}

	useEffect(() => {
		fetchSubjects();
		fetchTeachers();
	}, []);

	// Filtered rows based on search
	const filteredRows = useMemo(() => {
		let filtered = rows;
		if (searchQuery.trim() !== "") {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter((row) => {
				const subjectName = row.name.toLowerCase();
				const coordinatorName = (row.coordinator?.name ?? "").toLowerCase();

				return subjectName.includes(query) || coordinatorName.includes(query);
			});
		}
		return [...filtered].sort((a, b) =>
			sortOrder === "asc"
				? a.name.localeCompare(b.name)
				: b.name.localeCompare(a.name),
		);
	}, [rows, searchQuery, sortOrder]);

	// Reset to page 1 when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, sortOrder]);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, filteredRows.length]);

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
	const paginatedRows = useMemo(() => {
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		return filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
	}, [currentPage, filteredRows]);

	const paginationItems = useMemo(() => {
		if (totalPages <= 5) {
			return Array.from({ length: totalPages }, (_, index) => index + 1);
		}
		if (currentPage <= 3) {
			return [1, 2, 3, 4, "ellipsis", totalPages] as const;
		}
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

	// Stats for cards
	const stats = {
		total: rows.length,
		withCoordinator: rows.filter((r) => r.coordinator !== null).length,
		withoutCoordinator: rows.filter((r) => r.coordinator === null).length,
	};

	const coordinatorOptions = useMemo(() => {
		const base = teachers.filter((teacher) =>
			teacher.roles?.includes("subject coordinator"),
		);
		const assignedCoordinatorIds = new Set(
			rows.map((s) => s.coordinator?.id).filter(Boolean) as string[],
		);
		const currentCoordinatorForSubject = assigning?.coordinator?.id ?? "";

		// Only show unassigned coordinators. Keep current coordinator in list so the selected
		// value can still display even when dropdown is locked.
		return base.filter(
			(t) =>
				!assignedCoordinatorIds.has(t.id) ||
				(currentCoordinatorForSubject && t.id === currentCoordinatorForSubject),
		);
	}, [teachers, rows, assigning?.coordinator?.id]);

	async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const fd = new FormData(form);
		const subject_name = normalizeSpaces(
			addName || String(fd.get("subject_name") ?? ""),
		);
		setAddNameTouched(true);
		if (!subject_name || !isWordsOnlyName(subject_name)) return;

		const toastId = toast.loading("Menambah subjek...");
		try {
			const res = await fetch("/api/admin/subjects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ subject_name }),
			});

			const json = await res.json();

			if (res.ok) {
				toast.success("Subjek berjaya ditambah", { id: toastId });
				form.reset();
				setAddName("");
				setAddNameTouched(false);
				setAddOpen(false);
				// PENTING: Gunakan router.refresh() atau fetchSubjects()
				// untuk sync semula data UI dengan DB
				await fetchSubjects();
			} else {
				toast.error(json?.message ?? "Gagal", { id: toastId });
			}
		} catch (err) {
			// Jika data masuk DB tapi tetap masuk sini,
			// maknanya ralat berlaku semasa proses 'update UI'
			toast.error("Ralat komunikasi pelayar", { id: toastId });
			console.error(err);
		}
	}

	async function handleSaveEdit() {
		if (!editing) return;
		setEditNameTouched(true);
		if (!editNameIsValid) return;
		const toastId = toast.loading("Menyimpan...");
		try {
			const res = await fetch("/api/admin/subjects", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject_id: editing.id,
					subject_name: editNameNormalized,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal", { id: toastId });
				return;
			}
			toast.success("Subjek dikemaskini", { id: toastId });
			setEditing(null);
			fetchSubjects();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	async function handleDelete() {
		if (!deleting) return;
		const toastId = toast.loading("Memadam...");
		try {
			const res = await fetch(`/api/admin/subjects?id=${deleting.id}`, {
				method: "DELETE",
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal", { id: toastId });
				return;
			}
			toast.success("Dipadam", { id: toastId });
			setDeleting(null);
			fetchSubjects();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	async function handleAssignCoordinator() {
		if (!assigning || !selectedTeacherId) return;

		setAssignLoading(true);
		const toastId = toast.loading("Menyimpan panitia subjek...");

		try {
			const res = await fetch("/api/admin/subject-coordinator", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject_id: assigning.id,
					teacher_id: selectedTeacherId,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.error ?? "Gagal", { id: toastId });
				return;
			}

			const teacherName = teachers.find((t) => t.id === selectedTeacherId)?.name;
			toast.success(
				`${teacherName} telah dilantik sebagai panitia subjek ${assigning.name}`,
				{
					id: toastId,
				},
			);

			setAssigning(null);
			setSelectedTeacherId("");
			setIsChangingCoordinator(false);
			fetchSubjects();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		} finally {
			setAssignLoading(false);
		}
	}

	async function handleRemoveCoordinator() {
		if (!assigning) return;
		const toastId = toast.loading("Membuang panitia subjek...");
		try {
			const res = await fetch(
				`/api/admin/subject-coordinator?subject_id=${assigning.id}`,
				{ method: "DELETE" },
			);
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.error ?? "Gagal", { id: toastId });
				return;
			}
			toast.success("Lantikan panitia subjek dibuang", { id: toastId });
			setAssigning(null);
			setSelectedTeacherId("");
			fetchSubjects(); // Refresh senarai subjek
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	const getCoordinatorName = (
		coordinator: { id: string; name: string } | null,
	) => {
		if (!coordinator) return "—";
		return coordinator.name;
	};

	const getAssignedCoordinator = (subject: SubjectRow) => {
		return subject.coordinator;
	};

	const currentCoordinatorForAssigningSubject = assigning?.coordinator?.id ?? "";
	const isCoordinatorSelectLocked =
		Boolean(currentCoordinatorForAssigningSubject) && !isChangingCoordinator;
	const isAssignCoordinatorSaveDisabled =
		assignLoading ||
		isCoordinatorSelectLocked ||
		!selectedTeacherId ||
		(currentCoordinatorForAssigningSubject !== "" &&
			selectedTeacherId === currentCoordinatorForAssigningSubject);

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			{/* PAGE HEADER */}
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
						Pentadbiran
					</p>
					<h1 className="!text-[36px] font-black leading-tight text-foreground">
						Subjek
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={fetchSubjects}
						disabled={loading}
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
						<span className="ml-1.5">Muat Semula</span>
					</Button>
					<Dialog
						open={addOpen}
						onOpenChange={(open) => {
							setAddOpen(open);
							if (!open) {
								setAddName("");
								setAddNameTouched(false);
							}
						}}
					>
						<DialogTrigger asChild>
							<Button size="sm">
								<Plus className="w-3.5 h-3.5" />
								<span className="ml-1.5">Tambah Subjek</span>
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
							<DialogHeader className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-xl bg-primary/10">
										<Plus className="w-6 h-6 text-primary" />
									</div>
									<DialogTitle className="text-xl font-bold">
										Daftar Subjek Baharu
									</DialogTitle>
								</div>
							</DialogHeader>
							<form onSubmit={handleAdd} className="space-y-5">
								<div className="space-y-4">
									<div className="flex items-center gap-2 mb-2">
										<BookOpen className="w-4 h-4 text-primary" />
										<h3 className="font-semibold text-foreground">Maklumat Subjek</h3>
									</div>
									<div className="space-y-2">
										<Label className="flex items-center gap-1">
											<p> Nama Subjek </p>
											<span className="text-red-500">*</span>
										</Label>
										<Input
											name="subject_name"
											value={addName}
											onChange={(e) => {
												const next = e.target.value;
												setAddName(next);
												if (/\d/.test(next)) setAddNameTouched(true);
											}}
											onBlur={() => setAddNameTouched(true)}
											placeholder="contoh: Biologi, Matematik, Sejarah"
											required
											aria-invalid={Boolean(addNameError)}
											className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
												addNameError ? "border-red-400" : "border-border/30"
											}`}
										/>
										{addNameError && (
											<div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
												<AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
												<span className="leading-4">{addNameError}</span>
											</div>
										)}
									</div>
								</div>
								<div className="flex flex-col gap-3 pt-4 sm:flex-row">
									<Button
										type="button"
										variant="outline"
										onClick={() => setAddOpen(false)}
										className="flex-1 rounded-xl border-2 border-border/30 h-11 hover:bg-muted/50"
									>
										Batal
									</Button>
									<Button
										type="submit"
										disabled={!addNameIsValid}
										className="flex-1 h-11"
									>
										<Plus className="w-4 h-4 mr-2" />
										Simpan Subjek
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* MAIN CONTENT CARD */}
			<Card className="border-border bg-card overflow-hidden">
				<CardHeader className="border-b border-border/60 px-6 py-4">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-semibold text-foreground">
							Senarai Subjek
						</CardTitle>
						<p className="text-xs text-muted-foreground">
							{filteredRows.length} subjek dijumpai
						</p>
					</div>
				</CardHeader>

				<CardContent className="p-6">
					{/* SEARCH SECTION */}
					<div className="flex flex-col lg:flex-row gap-4 mb-6">
						<div className="flex-1 relative">
							<Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Cari subjek atau panitia subjek..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
							/>
						</div>
						<Button
							variant="outline"
							onClick={() => {
								setSearchQuery("");
								setSortOrder("asc");
							}}
							className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
						>
							Reset
						</Button>
					</div>

					{/* TABLE SECTION */}
					<div className="rounded-lg border border-border overflow-hidden">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-muted/30">
									<TableRow className="hover:bg-transparent border-b border-border">
										<TableHead className="font-semibold text-foreground py-4 w-16 text-center">
											#
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													setSortOrder((order) => (order === "asc" ? "desc" : "asc"))
												}
												className="p-0 h-auto font-semibold hover:bg-transparent"
											>
												Nama Subjek
												{sortOrder === "asc" ? (
													<SortAsc className="w-3.5 h-3.5 ml-1" />
												) : (
													<SortDesc className="w-3.5 h-3.5 ml-1" />
												)}
											</Button>
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4">
											Panitia Subjek
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-right pr-6">
											Tindakan
										</TableHead>
									</TableRow>
								</TableHeader>

								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell colSpan={4} className="py-16">
												<div className="flex flex-col items-center justify-center gap-4">
													<RefreshCw className="w-10 h-10 animate-spin text-primary" />
													<div className="text-center">
														<p className="font-semibold text-foreground">
															Memuatkan data subjek...
														</p>
													</div>
												</div>
											</TableCell>
										</TableRow>
									) : filteredRows.length === 0 ? (
										<TableRow>
											<TableCell colSpan={4} className="py-16">
												<div className="flex flex-col items-center justify-center gap-4">
													<BookOpen className="w-12 h-12 text-muted-foreground/50" />
													<div className="text-center">
														<p className="font-semibold text-foreground">
															Tiada subjek dijumpai
														</p>
														<p className="text-sm text-muted-foreground mt-1 max-w-md">
															{searchQuery
																? "Tiada subjek yang sepadan dengan carian anda"
																: "Mulakan dengan menambah subjek pertama"}
														</p>
													</div>
													{!searchQuery && (
														<Button
															className="bg-primary hover:bg-primary/90 text-primary-foreground"
															onClick={() => setAddOpen(true)}
														>
															<Plus className="w-4 h-4 mr-2" />
															Tambah Subjek Pertama
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									) : (
										paginatedRows.map((subject, index) => {
											const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
											const coordinator = getAssignedCoordinator(subject);

											return (
												<TableRow
													key={subject.id}
													className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
												>
													<TableCell
														className="py-4 text-center cursor-pointer"
														onClick={() => {
															setAssigning(subject);
															setIsChangingCoordinator(false);
															setSelectedTeacherId(subject.coordinator?.id ?? "");
														}}
													>
														<div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
															{displayIndex}
														</div>
													</TableCell>

													<TableCell
														className="py-4 cursor-pointer"
														onClick={() => {
															setAssigning(subject);
															setIsChangingCoordinator(false);
															setSelectedTeacherId(subject.coordinator?.id ?? "");
														}}
													>
														<div className="flex items-center gap-3">
															<div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
																<span className="text-sm font-semibold text-primary">
																	{subject.name.charAt(0)}
																</span>
															</div>
															<div>
																<div className="font-semibold text-foreground group-hover:text-primary transition-colors">
																	{subject.name}
																</div>
															</div>
														</div>
													</TableCell>

													<TableCell className="py-4">
														{coordinator ? (
															<div className="flex items-center gap-2">
																<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
																	<span className="text-sm font-semibold text-primary">
																		{coordinator.name.charAt(0)}
																	</span>
																</div>
																<div>
																	<div className="font-medium text-foreground">
																		{coordinator.name}
																	</div>
																</div>
															</div>
														) : (
															<div className="flex items-center gap-2 text-muted-foreground">
																<UserPlus className="w-4 h-4" />
																<span className="italic">Belum dilantik</span>
															</div>
														)}
													</TableCell>

													<TableCell className="py-4 text-right pr-6">
														<div className="flex justify-end gap-2">
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-primary"
																onClick={() => {
																	setAssigning(subject);
																	setIsChangingCoordinator(false);
																	setSelectedTeacherId(subject.coordinator?.id ?? "");
																}}
																title={
																	subject.coordinator
																		? "Tukar panitia subjek"
																		: "Lantik panitia subjek"
																}
																aria-label={
																	subject.coordinator
																		? "Tukar panitia subjek"
																		: "Lantik panitia subjek"
																}
															>
																<UserPlus className="w-4 h-4" />
															</Button>
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-blue-600"
																onClick={() => {
																	setEditing(subject);
																	setEditName(subject.name);
																	setEditNameTouched(false);
																}}
																title="Kemaskini subjek"
																aria-label="Kemaskini subjek"
															>
																<Edit className="w-4 h-4" />
															</Button>
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-rose-600"
																onClick={() => setDeleting(subject)}
																title="Padam subjek"
																aria-label="Padam subjek"
															>
																<Trash2 className="w-4 h-4" />
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

				{/* FOOTER */}
				<div className="border-t border-border bg-muted/20 px-6 py-4">
					<div className="flex flex-col gap-4 text-sm">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							<div className="flex items-center gap-2 text-muted-foreground">
								<div className="flex items-center gap-1">
									<span>Menunjukkan</span>
									<span className="font-semibold text-foreground">
										{(currentPage - 1) * PAGE_SIZE + 1}
										{" - "}
										{Math.min(currentPage * PAGE_SIZE, filteredRows.length)}{" "}
									</span>
									<span>daripada</span>
									<span className="font-semibold text-foreground">{rows.length}</span>
									<span>subjek</span>
								</div>
							</div>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Clock className="w-4 h-4" />
									<span>
										Kemas kini: <LastUpdatedTime />
									</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={fetchSubjects}
									disabled={loading}
									className="h-8"
								>
									{loading && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
									Muat Semula Data
								</Button>
							</div>
						</div>

						{!loading && totalPages > 1 && (
							<div className="flex flex-col gap-3 border-t border-border/60 pt-4">
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

			{/* EDIT DIALOG */}
			<Dialog
				open={Boolean(editing)}
				onOpenChange={(open) => {
					if (!open) {
						setEditing(null);
						setEditNameTouched(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<Edit className="w-5 h-5 text-primary" />
							Kemaskini Subjek
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-5 py-4">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label className="flex items-center gap-1">
									<BookOpen className="w-3.5 h-3.5" /> Nama Subjek
								</Label>
								<Input
									value={editName}
									onChange={(e) => {
										const next = e.target.value;
										setEditName(next);
										if (/\d/.test(next)) setEditNameTouched(true);
									}}
									onBlur={() => setEditNameTouched(true)}
									aria-invalid={Boolean(editNameError)}
									className={`h-11 ${editNameError ? "border-red-400" : ""}`}
								/>
								{editNameError && (
									<div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
										<AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
										<span className="leading-4">{editNameError}</span>
									</div>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setEditing(null);
								setEditNameTouched(false);
							}}
						>
							Batal
						</Button>
						<Button
							onClick={handleSaveEdit}
							disabled={!editNameIsValid}
							className="bg-primary px-8"
						>
							Simpan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* DELETE CONFIRMATION */}
			<Dialog open={Boolean(deleting)} onOpenChange={() => setDeleting(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive font-bold">
							Padam Subjek?
						</DialogTitle>
					</DialogHeader>
					<p>
						Padam rekod <strong>{deleting?.name}</strong>?
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleting(null)}>
							Batal
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Ya, Padam
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ASSIGN COORDINATOR DIALOG - Styled like classes page */}
			<Dialog
				open={Boolean(assigning)}
				onOpenChange={(open) => {
					if (!open) {
						setAssigning(null);
						setSelectedTeacherId("");
						setIsChangingCoordinator(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<UserPlus className="w-5 h-5 text-primary" />
							Lantik Panitia Subjek
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-5 py-4">
						<div className="space-y-4">
							{/* Info Box - Meniru gaya input readonly dalam classes page */}
							<div className="space-y-2">
								<Label className="flex items-center gap-1 text-muted-foreground">
									<BookOpen className="w-3.5 h-3.5" /> Nama Subjek
								</Label>
								<div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
									{assigning?.name}
								</div>
							</div>

							{/* Pemilihan Guru */}
							<div className="space-y-2">
								<Label className="flex items-center gap-1">
									<UserPlus className="w-3.5 h-3.5" /> Pilih Guru Panitia Subjek{" "}
									<span className="text-red-500">*</span>
								</Label>
								<Select
									value={selectedTeacherId}
									onValueChange={setSelectedTeacherId}
									disabled={assignLoading || isCoordinatorSelectLocked}
								>
									<SelectTrigger className="h-11 border-border">
										<SelectValue placeholder="Pilih guru panitia subjek" />
									</SelectTrigger>
									<SelectContent>
										{coordinatorOptions.length === 0 ? (
											<SelectItem value="none" disabled>
												Tiada panitia subjek ditemui
											</SelectItem>
										) : (
											coordinatorOptions.map((t) => {
												const assignedCoordinatorIds = new Set(
													rows.map((subject) => subject.coordinator?.id).filter(Boolean),
												);
												const currentCoordinatorForSubject =
													assigning?.coordinator?.id ?? "";
												const disabled =
													assignedCoordinatorIds.has(t.id) &&
													t.id !== currentCoordinatorForSubject;

												return (
													<SelectItem key={t.id} value={t.id} disabled={disabled}>
														{t.name} {disabled ? "- Sudah Ada Subjek" : ""}
													</SelectItem>
												);
											})
										)}
									</SelectContent>
								</Select>
							</div>

							{/* Note Box - Selaras dengan nota di Edit Student */}
							<div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mt-2">
								<p className="text-[11px] text-amber-700 leading-relaxed italic">
									<strong>Nota:</strong> Panitia subjek bertanggungjawab untuk
									menguruskan maklumat peperiksaan dan laporan bagi subjek{" "}
									<strong>{assigning?.name}</strong>.
								</p>
							</div>
						</div>
					</div>
					<DialogFooter>
						<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								{assigning?.coordinator && (
									<Button
										type="button"
										variant="destructive"
										onClick={() => {
											setIsChangingCoordinator(true);
											setSelectedTeacherId("");
										}}
										disabled={assignLoading || isChangingCoordinator}
									>
										<UserPlus className="w-4 h-4 mr-2" />
										Tukar Panitia Subjek
									</Button>
								)}
							</div>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setAssigning(null)}
									disabled={assignLoading}
								>
									Batal
								</Button>
								<Button
									onClick={handleAssignCoordinator}
									disabled={isAssignCoordinatorSaveDisabled}
									className="bg-primary px-8"
								>
									{assignLoading ? "Menyimpan..." : "Simpan"}
								</Button>
							</div>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
