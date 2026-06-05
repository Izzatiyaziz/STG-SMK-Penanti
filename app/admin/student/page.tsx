"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AddStudentDialog } from "./add-student-dialog";
import {
	Search,
	Users,
	Filter,
	Loader2,
	UserPlus,
	RefreshCw,
	Download,
	Edit,
	Trash2,
	SortAsc,
	SortDesc,
	GraduationCap,
	School,
	Calendar,
	X,
	AlertCircle,
	Clock,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
	formatMalaysiaDate,
	formatMalaysiaTime,
	getMalaysiaDateInputValue,
} from "@/lib/date-utils";
import { exportStudentsPDF } from "@/lib/export-pdf";

type ClassRow = { id: string; name: string; grade: number };

type StudentRow = {
	id: string;
	name: string;
	identifier: string;
	class_id: string | null;
	className: string;
	status: string;
	enrollment_date: string | null;
	level: string | null;
};

const normalizeIcDigits = (value: string) => value.replace(/\D/g, "");

const formatIcNumber = (value: string) => {
	const digits = normalizeIcDigits(value);
	if (digits.length <= 6) return digits;
	if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
	return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
};

// Helper: Detect Tingkatan from IC (based on age)
const detectLevelFromIC = (ic: string): string | null => {
	const digits = normalizeIcDigits(ic);
	if (digits.length < 12) return null;
	const yearPart = parseInt(digits.substring(0, 2));
	const currentYear = new Date().getFullYear();
	const fullYear =
		yearPart > currentYear % 100 ? 1900 + yearPart : 2000 + yearPart;
	const age = currentYear - fullYear;

	if (age === 13) return "1";
	if (age === 14) return "2";
	if (age === 15) return "3";
	if (age === 16) return "4";
	if (age === 17) return "5";
	return null;
};

// Helper: Get age from IC for display
const getAgeFromIC = (ic: string): number | null => {
	const digits = normalizeIcDigits(ic);
	if (digits.length < 12) return null;
	const yearPart = parseInt(digits.substring(0, 2));
	const currentYear = new Date().getFullYear();
	const fullYear =
		yearPart > currentYear % 100 ? 1900 + yearPart : 2000 + yearPart;
	return currentYear - fullYear;
};

// Format date to local string
const formatDate = (dateString: string | null): string => {
	return formatMalaysiaDate(dateString);
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

export default function AdminStudentsPage() {
	const PAGE_SIZE = 10;
	const [classes, setClasses] = useState<ClassRow[]>([]);
	const [rows, setRows] = useState<StudentRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterLevel, setFilterLevel] = useState<string>("default-level-1");
	const [filterClassName, setFilterClassName] = useState<string>("all");
	const [sortBy, setSortBy] = useState<"name" | "level" | "date">("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [currentPage, setCurrentPage] = useState(1);

	// Edit dialog states
	const [editing, setEditing] = useState<StudentRow | null>(null);
	const [editName, setEditName] = useState("");
	const [editIc, setEditIc] = useState("");
	const [editLevel, setEditLevel] = useState<string>("");
	const [editOriginalLevel, setEditOriginalLevel] = useState<string>("");
	const [editDetectedLevel, setEditDetectedLevel] = useState<string | null>(
		null,
	);
	const [editUserOverridden, setEditUserOverridden] = useState(false);
	const [editEnrollmentDate, setEditEnrollmentDate] = useState<string>("");
	const [confirmDelete, setConfirmDelete] = useState(false);

	async function fetchClasses() {
		try {
			const res = await fetch("/api/admin/classes");
			const data = await res.json();
			setClasses(data ?? []);
		} catch {
			setClasses([]);
		}
	}

	async function fetchStudents(search = "") {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page: "1", page_size: "500" });
			if (search.trim()) params.set("search", search.trim());
			const res = await fetch(`/api/admin/students?${params}`);
			const json = await res.json();
			setRows(json?.data ?? []);
		} catch {
			setRows([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchClasses();
		fetchStudents();
	}, []);

	const classNameOptions = useMemo(() => {
		const uniqueNames = new Set<string>();
		for (const cls of classes) uniqueNames.add(cls.name);
		for (const student of rows) {
			if (student.className) uniqueNames.add(student.className);
		}
		return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b));
	}, [classes, rows]);

	// ================= FILTER AND SORT =================
	const filteredStudents = rows
		.filter((s) => {
			const matchesSearch =
				s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.identifier.includes(searchQuery);
			const effectiveFilterLevel =
				filterLevel === "default-level-1" ? "1" : filterLevel;
			const matchesLevel =
				effectiveFilterLevel === "all" ||
				s.level?.toString() === effectiveFilterLevel;
			const matchesClass =
				filterClassName === "all" ||
				(filterClassName === "__unassigned__"
					? !s.className
					: s.className === filterClassName);
			return matchesSearch && matchesLevel && matchesClass;
		})
		.sort((a, b) => {
			let compareA, compareB;

			switch (sortBy) {
				case "name":
					compareA = a.name.toLowerCase();
					compareB = b.name.toLowerCase();
					break;
				case "level":
					compareA = parseInt(a.level || "0");
					compareB = parseInt(b.level || "0");
					break;
				case "date":
					compareA = a.enrollment_date || "";
					compareB = b.enrollment_date || "";
					break;
				default:
					compareA = a.name.toLowerCase();
					compareB = b.name.toLowerCase();
			}

			if (sortOrder === "asc") {
				return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
			} else {
				return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
			}
		});

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, filterLevel, filterClassName, sortBy, sortOrder]);

	useEffect(() => {
		const totalPages = Math.max(
			1,
			Math.ceil(filteredStudents.length / PAGE_SIZE),
		);
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, filteredStudents.length]);

	const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
	const paginatedStudents = useMemo(() => {
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
	}, [currentPage, filteredStudents]);

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

	// ================= STATS =================
	const stats = {
		total: rows.length,
		form1: rows.filter((s) => s.level === "1").length,
		form2: rows.filter((s) => s.level === "2").length,
		form3: rows.filter((s) => s.level === "3").length,
		form4: rows.filter((s) => s.level === "4").length,
		form5: rows.filter((s) => s.level === "5").length,
	};

	const handleLevelCardClick = (level: "1" | "2" | "3" | "4" | "5") => {
		setFilterLevel(level);
	};

	// ================= LEVEL COLORS =================
	const getLevelColor = (level: string | null) => {
		switch (level) {
			case "1":
				return {
					bg: "bg-emerald-100",
					text: "text-emerald-700",
					border: "border-emerald-200",
				};
			case "2":
				return {
					bg: "bg-blue-100",
					text: "text-blue-700",
					border: "border-blue-200",
				};
			case "3":
				return {
					bg: "bg-amber-100",
					text: "text-amber-700",
					border: "border-amber-200",
				};
			case "4":
				return {
					bg: "bg-purple-100",
					text: "text-purple-700",
					border: "border-purple-200",
				};
			case "5":
				return {
					bg: "bg-rose-100",
					text: "text-rose-700",
					border: "border-rose-200",
				};
			default:
				return {
					bg: "bg-gray-100",
					text: "text-gray-700",
					border: "border-gray-200",
				};
		}
	};

	// ================= ACTIONS =================
	const handleExport = () => {
		if (filteredStudents.length === 0) {
			toast.error("Tiada data untuk dieksport");
			return;
		}
		const parts: string[] = [];
		if (filterLevel !== "all" && filterLevel !== "default-level-1") {
			parts.push(`Tingkatan ${filterLevel}`);
		} else if (filterLevel === "default-level-1") {
			parts.push("Tingkatan 1");
		}
		if (filterClassName !== "all") {
			parts.push(filterClassName === "__unassigned__" ? "Belum Tetap" : filterClassName);
		}
		exportStudentsPDF(filteredStudents, parts.length ? parts.join(", ") : undefined);
		toast.success("PDF sedang dimuat turun...");
	};

	function openEdit(s: StudentRow) {
		setEditing(s);
		setEditName(s.name);
		setEditIc(formatIcNumber(s.identifier));
		setEditLevel(s.level || "");
		setEditOriginalLevel(s.level || "");
		setEditEnrollmentDate(
			s.enrollment_date
				? getMalaysiaDateInputValue(new Date(s.enrollment_date))
				: "",
		);

		const detected = detectLevelFromIC(s.identifier);
		setEditDetectedLevel(detected);
		setEditUserOverridden(s.level !== detected);
	}

	async function handleSaveEdit() {
		if (!editing) return;
		const toastId = toast.loading("Menyimpan...");
		try {
			const res = await fetch(`/api/admin/students?id=${editing.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fullname: editName,
					ic_number: editIc,
					level: editLevel,
					enrollment_date: editEnrollmentDate || null,
				}),
			});
			if (!res.ok) throw new Error();
			toast.success("Maklumat dikemaskini", { id: toastId });
			setEditing(null);
			fetchStudents();
		} catch {
			toast.error("Gagal menyimpan", { id: toastId });
		}
	}

	async function handleDelete() {
		if (!editing) return;
		const toastId = toast.loading("Memadam...");
		try {
			const res = await fetch(`/api/admin/students?id=${editing.id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error();
			toast.success("Pelajar dipadam", { id: toastId });
			setConfirmDelete(false);
			setEditing(null);
			fetchStudents();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	// ================= TOGGLE SORT =================
	const toggleSort = (field: "name" | "level" | "date") => {
		if (sortBy === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(field);
			setSortOrder("asc");
		}
	};

	// Close edit dialog without saving
	const closeEditDialog = () => {
		setEditing(null);
		setEditName("");
		setEditIc("");
		setEditLevel("");
		setEditOriginalLevel("");
		setEditDetectedLevel(null);
		setEditUserOverridden(false);
		setEditEnrollmentDate("");
	};

	const cancelDeleteDialog = () => {
		setConfirmDelete(false);
		closeEditDialog();
	};

	const handleEditICChange = (ic: string) => {
		const formatted = formatIcNumber(ic);
		setEditIc(formatted);
		const detected = detectLevelFromIC(formatted);
		setEditDetectedLevel(detected);

		// Only auto-set level if:
		// 1. User hasn't manually overridden in this session
		// 2. There's a detected level
		// 3. Current level equals the ORIGINAL level (means user hasn't changed it yet in this edit session)
		if (!editUserOverridden && detected && editLevel === editOriginalLevel) {
			setEditLevel(detected);
		}
	};

	const handleEditLevelChange = (value: string) => {
		setEditLevel(value);
		setEditUserOverridden(true);
	};

	const resetEditToAuto = () => {
		if (editDetectedLevel) {
			setEditLevel(editDetectedLevel);
			setEditUserOverridden(false);
		}
	};

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			{/* PAGE HEADER */}
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
						Pentadbiran
					</p>
					<h1 className="!text-[36px] font-black leading-tight text-foreground">
						Pelajar
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={fetchStudents}
						disabled={loading}
					>
						{loading ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						) : (
							<RefreshCw className="w-3.5 h-3.5" />
						)}
						<span className="ml-1.5">Muat Semula</span>
					</Button>
					<Button variant="outline" size="sm" onClick={handleExport}>
						<Download className="w-3.5 h-3.5" />
						<span className="ml-1.5">Eksport</span>
					</Button>
					<AddStudentDialog onSuccess={fetchStudents} classes={classes}>
						<Button size="sm">
							<UserPlus className="w-3.5 h-3.5" />
							<span className="ml-1.5">Tambah Pelajar</span>
						</Button>
					</AddStudentDialog>
				</div>
			</div>

			{/* LEVEL FILTER — typographic tap row, no icon boxes */}
			<div className="grid grid-cols-5 gap-px bg-border/40">
				{(
					[
						{ level: "1", count: stats.form1, label: "Tingkatan 1" },
						{ level: "2", count: stats.form2, label: "Tingkatan 2" },
						{ level: "3", count: stats.form3, label: "Tingkatan 3" },
						{ level: "4", count: stats.form4, label: "Tingkatan 4" },
						{ level: "5", count: stats.form5, label: "Tingkatan 5" },
					] as const
				).map(({ level, count, label }) => {
					const isActive =
						filterLevel === level ||
						(filterLevel === "default-level-1" && level === "1");
					return (
						<button
							key={level}
							onClick={() => handleLevelCardClick(level)}
							className={`flex flex-col gap-1.5 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
								isActive
									? "bg-primary text-primary-foreground"
									: "bg-card hover:bg-card/80 text-foreground"
							}`}
						>
							<span
								className={`!text-[32px] font-black leading-none ${isActive ? "text-primary-foreground" : "text-primary"}`}
							>
								{count}
							</span>
							<span
								className={`text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}
							>
								{label}
							</span>
						</button>
					);
				})}
			</div>

			{/* MAIN CONTENT CARD */}
			<Card className="border-border bg-card overflow-hidden">
				<CardHeader className="border-b border-border/60 px-6 py-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="font-semibold text-foreground">
								Senarai Pelajar
							</CardTitle>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{filteredStudents.length} pelajar dijumpai
							</p>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-6">
					{/* FILTER AND SEARCH SECTION */}
					<div className="flex flex-col lg:flex-row gap-4 mb-6">
						<div className="flex-1 relative">
							<Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Cari pelajar (nama atau no. IC)..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
							/>
						</div>

						<div className="flex flex-col sm:flex-row gap-3">
							<div className="w-full sm:w-[200px]">
								<Select value={filterLevel} onValueChange={setFilterLevel}>
									<SelectTrigger className="h-11 rounded-lg border-border bg-background">
										<SelectValue placeholder="Pilih Tingkatan" />
									</SelectTrigger>
									<SelectContent className="rounded-lg border-border">
										<SelectItem value="default-level-1">
											<div className="flex items-center gap-2">
												<GraduationCap className="w-4 h-4" />
												Tingkatan
											</div>
										</SelectItem>
										<SelectItem value="1">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-emerald-500" />
												Tingkatan 1
											</div>
										</SelectItem>
										<SelectItem value="2">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-blue-500" />
												Tingkatan 2
											</div>
										</SelectItem>
										<SelectItem value="3">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-amber-500" />
												Tingkatan 3
											</div>
										</SelectItem>
										<SelectItem value="4">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-purple-500" />
												Tingkatan 4
											</div>
										</SelectItem>
										<SelectItem value="5">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-rose-500" />
												Tingkatan 5
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="w-full sm:w-[180px]">
								<Select value={filterClassName} onValueChange={setFilterClassName}>
									<SelectTrigger className="h-11 rounded-lg border-border bg-background">
										<SelectValue placeholder="Pilih Kelas" />
									</SelectTrigger>
									<SelectContent className="rounded-lg border-border max-h-72 overflow-y-auto">
										<SelectItem value="all">
											<div className="flex items-center gap-2">
												<School className="w-4 h-4" />
												Semua Kelas
											</div>
										</SelectItem>
										{rows.some((s) => !s.className) && (
											<SelectItem value="__unassigned__">Belum Tetap</SelectItem>
										)}
										{classNameOptions.map((name) => (
											<SelectItem key={name} value={name}>
												{name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<Button
								variant="outline"
								onClick={() => {
									setSearchQuery("");
									setFilterLevel("default-level-1");
									setFilterClassName("all");
									setSortBy("name");
									setSortOrder("asc");
								}}
								className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
							>
								Reset
							</Button>
						</div>
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
												onClick={() => toggleSort("name")}
												className="p-0 h-auto font-semibold hover:bg-transparent"
											>
												Nama Pelajar
												{sortBy === "name" &&
													(sortOrder === "asc" ? (
														<SortAsc className="w-3.5 h-3.5 ml-1" />
													) : (
														<SortDesc className="w-3.5 h-3.5 ml-1" />
													))}
											</Button>
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4">
											No. Kad Pengenalan
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4">
											Tingkatan
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4">
											Kelas
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => toggleSort("date")}
												className="p-0 h-auto font-semibold hover:bg-transparent"
											>
												Tarikh Daftar
												{sortBy === "date" &&
													(sortOrder === "asc" ? (
														<SortAsc className="w-3.5 h-3.5 ml-1" />
													) : (
														<SortDesc className="w-3.5 h-3.5 ml-1" />
													))}
											</Button>
										</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-right pr-6">
											Tindakan
										</TableHead>
									</TableRow>
								</TableHeader>

								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell colSpan={7} className="py-16">
												<div className="flex flex-col items-center justify-center gap-4">
													<Loader2 className="w-10 h-10 animate-spin text-primary" />
													<p className="font-semibold text-foreground">
														Memuatkan data pelajar...
													</p>
												</div>
											</TableCell>
										</TableRow>
									) : filteredStudents.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="py-16">
												<div className="flex flex-col items-center justify-center gap-4">
													<div className="p-4 rounded-full bg-muted/50">
														<Users className="w-12 h-12 text-muted-foreground/50" />
													</div>
													<p className="font-semibold text-foreground">
														Tiada pelajar dijumpai
													</p>
													{!searchQuery &&
														filterLevel === "all" &&
														filterClassName === "all" && (
															<AddStudentDialog onSuccess={fetchStudents} classes={classes}>
																<Button className="bg-primary">Tambah Pelajar Pertama</Button>
															</AddStudentDialog>
														)}
												</div>
											</TableCell>
										</TableRow>
									) : (
										paginatedStudents.map((student, index) => {
											const levelColors = getLevelColor(student.level);
											const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
											const expectedLevel = detectLevelFromIC(student.identifier);
											const isPeralihan = expectedLevel && student.level !== expectedLevel;

											return (
												<TableRow
													key={student.id}
													className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
												>
													<TableCell
														className="py-4 text-center cursor-pointer"
														onClick={() => openEdit(student)}
													>
														{displayIndex}
													</TableCell>
													<TableCell
														className="py-4 cursor-pointer"
														onClick={() => openEdit(student)}
													>
														<div className="flex items-center gap-3">
															<div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
																<span className="text-sm font-semibold text-primary">
																	{student.name.charAt(0)}
																</span>
															</div>
															<div>
																<div className="font-semibold">{student.name}</div>
																{isPeralihan && (
																	<Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
																		Kelas Peralihan
																	</Badge>
																)}
															</div>
														</div>
													</TableCell>
													<TableCell className="py-4">
														<span className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-sm">
															{student.identifier}
														</span>
													</TableCell>
													<TableCell className="py-4">
														<Badge
															className={`px-3 py-1.5 ${levelColors.bg} ${levelColors.text} ${levelColors.border}`}
														>
															Tingkatan {student.level || "—"}
														</Badge>
													</TableCell>
													<TableCell className="py-4">
														<div className="flex items-center gap-2">
															<School className="w-4 h-4 text-muted-foreground" />
															<span>{student.className || "Belum Tetap"}</span>
														</div>
													</TableCell>
													<TableCell className="py-4">
														<div className="flex items-center gap-2 text-muted-foreground">
															<Calendar className="w-4 h-4" />
															<span>{formatDate(student.enrollment_date)}</span>
														</div>
													</TableCell>
													<TableCell className="py-4 text-right pr-6">
														<div className="flex justify-end gap-2">
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-blue-600"
																onClick={() => openEdit(student)}
															>
																<Edit className="w-4 h-4" />
															</Button>
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-rose-600"
																onClick={() => {
																	setEditing(student);
																	setConfirmDelete(true);
																}}
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
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<div className="text-sm text-muted-foreground">
							Menunjukkan{" "}
							<span className="font-semibold text-foreground">
								{filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}{" "}
								–{" "}
								{filteredStudents.length === 0
									? 0
									: Math.min(currentPage * PAGE_SIZE, filteredStudents.length)}
							</span>{" "}
							daripada{" "}
							<span className="font-semibold text-foreground">
								{filteredStudents.length}
							</span>{" "}
							pelajar
							{filterLevel !== "all" && (
								<Badge variant="secondary" className="ml-2">
									Tingkatan {filterLevel === "default-level-1" ? "1" : filterLevel}
								</Badge>
							)}
							{filterClassName !== "all" && (
								<Badge variant="secondary" className="ml-2">
									{filterClassName === "__unassigned__"
										? "Belum Tetap"
										: filterClassName}
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-4">
							<Clock className="w-4 h-4" />
							<span className="text-sm">
								Kemas kini: <LastUpdatedTime />
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={fetchStudents}
								disabled={loading}
								className="font-semibold"
							>
								{loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
								Muat Semula Data
							</Button>
						</div>
					</div>
					{!loading && totalPages > 1 && (
						<div className="mt-4 border-t border-border/60 pt-4 flex justify-center">
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											href="#"
											onClick={(e) => {
												e.preventDefault();
												setCurrentPage((p) => Math.max(1, p - 1));
											}}
											className={
												currentPage === 1 ? "pointer-events-none opacity-50" : undefined
											}
										/>
									</PaginationItem>
									{paginationItems.map((item, idx) =>
										typeof item === "number" ? (
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
										) : (
											<PaginationItem key={`${item}-${idx}`}>
												<PaginationEllipsis />
											</PaginationItem>
										),
									)}
									<PaginationItem>
										<PaginationNext
											href="#"
											onClick={(e) => {
												e.preventDefault();
												setCurrentPage((p) => Math.min(totalPages, p + 1));
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
			</Card>

			{/* EDIT DIALOG */}
			<Dialog
				open={Boolean(editing) && !confirmDelete}
				onOpenChange={(open) => {
					if (!open) closeEditDialog();
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<button
						onClick={closeEditDialog}
						className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
					>
						<X className="h-4 w-4" />
					</button>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<Edit className="w-5 h-5 text-primary" /> Kemaskini Pelajar
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-5 py-4">
						<div className="space-y-2">
							<Label>Nama Penuh</Label>
							<Input
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								className="h-11"
							/>
						</div>

						<div className="space-y-2">
							<Label>No. Kad Pengenalan</Label>
							<Input
								value={editIc}
								maxLength={14}
								onChange={(e) => handleEditICChange(e.target.value)}
								className="h-11 font-mono"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Tingkatan</Label>
								{editUserOverridden && editDetectedLevel && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={resetEditToAuto}
										className="h-6 text-xs text-blue-600"
									>
										<RefreshCw className="w-3 h-3 mr-1" />
										Reset ke Auto ({editDetectedLevel})
									</Button>
								)}
							</div>
							<Select value={editLevel} onValueChange={handleEditLevelChange}>
								<SelectTrigger
									className={`h-11 ${editDetectedLevel && editDetectedLevel !== editLevel ? "border-amber-400 bg-amber-50/50" : ""}`}
								>
									<SelectValue placeholder="Pilih Tingkatan" />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4, 5].map((l) => (
										<SelectItem key={l} value={l.toString()}>
											Tingkatan {l}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{editDetectedLevel && editDetectedLevel !== editLevel && editLevel && (
								<div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 p-2 rounded-md">
									<AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
									<div className="text-amber-800">
										<span className="font-medium">Kelas Peralihan </span>
									</div>
								</div>
							)}
						</div>

						<div className="space-y-2">
							<Label>Tarikh Daftar</Label>
							<Input
								type="date"
								value={editEnrollmentDate}
								onChange={(e) => setEditEnrollmentDate(e.target.value)}
								className="h-11"
							/>
						</div>

						<div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
							<p className="text-[11px] text-amber-700 italic">
								<strong>Nota:</strong> Penetapan kelas hanya boleh dilakukan oleh Guru
								Kelas masing-masing.
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={closeEditDialog}>
							Batal
						</Button>
						<Button onClick={handleSaveEdit} className="bg-primary px-8">
							Simpan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* DELETE CONFIRMATION */}
			<Dialog
				open={confirmDelete}
				onOpenChange={(open) => {
					if (!open) cancelDeleteDialog();
					else setConfirmDelete(true);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive font-bold">
							Padam Pelajar?
						</DialogTitle>
					</DialogHeader>
					<p>
						Padam rekod <strong>{editing?.name}</strong>? Tindakan ini kekal.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={cancelDeleteDialog}>
							Batal
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Ya, Padam
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
