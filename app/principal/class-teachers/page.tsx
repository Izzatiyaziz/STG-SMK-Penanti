"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMalaysiaTime } from "@/lib/date-utils";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
	Clock,
	Filter,
	GraduationCap,
	RefreshCw,
	School,
	Search,
	UserPlus,
	Users,
} from "lucide-react";

type ClassRow = {
	id: string;
	name: string;
	grade: number;
	studentCount: number;
	teacherId: string;
	teacherName: string;
};

type TeacherOption = {
	id: string;
	name: string;
	identifier?: string;
	roles?: string[];
};

function getTimeLabel() {
	return formatMalaysiaTime();
}

function LastUpdatedTime() {
	const [time, setTime] = useState(() => getTimeLabel());

	useEffect(() => {
		const interval = setInterval(() => setTime(getTimeLabel()), 60000);
		return () => clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time}</span>;
}

function getGradeColor(grade: number) {
	switch (grade) {
		case 1:
			return "border-emerald-200 bg-emerald-100 text-emerald-700";
		case 2:
			return "border-blue-200 bg-blue-100 text-blue-700";
		case 3:
			return "border-amber-200 bg-amber-100 text-amber-700";
		case 4:
			return "border-purple-200 bg-purple-100 text-purple-700";
		case 5:
			return "border-rose-200 bg-rose-100 text-rose-700";
		default:
			return "border-gray-200 bg-gray-100 text-gray-700";
	}
}

export default function PrincipalClassTeachersPage() {
	const PAGE_SIZE = 5;
	const [rows, setRows] = useState<ClassRow[]>([]);
	const [teachers, setTeachers] = useState<TeacherOption[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterGrade, setFilterGrade] = useState("default-grade-1");
	const [filterClassName, setFilterClassName] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [assigning, setAssigning] = useState<ClassRow | null>(null);
	const [selectedTeacherId, setSelectedTeacherId] = useState("");
	const [isChangingClassTeacher, setIsChangingClassTeacher] = useState(false);

	async function fetchData() {
		setLoading(true);
		try {
			const res = await fetch("/api/principal/class-teachers", { cache: "no-store" });
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal memuatkan lantikan guru kelas");
				setRows([]);
				setTeachers([]);
				return;
			}
			setRows(Array.isArray(json?.rows) ? json.rows : []);
			setTeachers(Array.isArray(json?.teachers) ? json.teachers : []);
		} catch {
			toast.error("Ralat memuatkan lantikan guru kelas");
			setRows([]);
			setTeachers([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchData();
	}, []);

	const classNameOptions = useMemo(() => {
		return Array.from(new Set(rows.map((row) => row.name))).sort((a, b) => a.localeCompare(b));
	}, [rows]);

	const filteredRows = useMemo(() => {
		let filtered = rows;
		const effectiveGrade = filterGrade === "default-grade-1" ? "1" : filterGrade;

		if (effectiveGrade !== "all") {
			filtered = filtered.filter((row) => row.grade === Number(effectiveGrade));
		}

		if (filterClassName !== "all") {
			filtered = filtered.filter((row) => row.name === filterClassName);
		}

		const query = searchQuery.toLowerCase().trim();
		if (query) {
			filtered = filtered.filter((row) => {
				return (
					row.name.toLowerCase().includes(query) ||
					row.teacherName.toLowerCase().includes(query)
				);
			});
		}

		return filtered;
	}, [filterClassName, filterGrade, rows, searchQuery]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filterGrade, filterClassName, searchQuery]);

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
	const paginatedRows = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredRows.slice(start, start + PAGE_SIZE);
	}, [currentPage, filteredRows]);

	const paginationItems = useMemo(() => {
		if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
		if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
		if (currentPage >= totalPages - 2) {
			return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
		}
		return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages] as const;
	}, [currentPage, totalPages]);

	const classTeacherByClassId = useMemo(() => {
		return Object.fromEntries(rows.filter((row) => row.teacherId).map((row) => [row.id, row.teacherId]));
	}, [rows]);

	const classTeacherOptions = useMemo(() => {
		const assignedTeacherIds = new Set(Object.values(classTeacherByClassId));
		const currentTeacherForClass = assigning?.id ? classTeacherByClassId[assigning.id] ?? "" : "";
		return teachers.filter(
			(teacher) => !assignedTeacherIds.has(teacher.id) || teacher.id === currentTeacherForClass,
		);
	}, [assigning?.id, classTeacherByClassId, teachers]);

	const currentTeacherForAssigningClass =
		assigning?.id ? classTeacherByClassId[assigning.id] ?? "" : "";
	const isClassTeacherSelectLocked =
		Boolean(currentTeacherForAssigningClass) && !isChangingClassTeacher;
	const isAssignSaveDisabled =
		isClassTeacherSelectLocked ||
		!selectedTeacherId ||
		(currentTeacherForAssigningClass !== "" && selectedTeacherId === currentTeacherForAssigningClass);

	async function handleAssignClassTeacher() {
		if (!assigning || !selectedTeacherId) return;
		const toastId = toast.loading("Menyimpan guru kelas...");
		try {
			const res = await fetch("/api/admin/class-teacher", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					class_id: assigning.id,
					teacher_id: selectedTeacherId,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.error ?? json?.message ?? "Gagal menyimpan guru kelas", { id: toastId });
				return;
			}
			toast.success(json?.message ?? "Guru kelas berjaya dikemaskini", { id: toastId });
			setAssigning(null);
			setSelectedTeacherId("");
			setIsChangingClassTeacher(false);
			await fetchData();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="mx-auto max-w-7xl space-y-8">
				<div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 shadow-sm">
								<School className="h-7 w-7 text-primary" />
							</div>
							<div>
								<h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
									Lantikan Guru Kelas
								</h1>
								<p className="mt-1 font-medium text-muted-foreground">
									Pantau dan tukar guru kelas bagi tujuan tertentu. 
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								<span>Kemas kini: <LastUpdatedTime /></span>
							</div>
						</div>
					</div>

					<Button variant="outline" onClick={fetchData} disabled={loading} className="border-border shadow-xs">
						<RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Muat Semula
					</Button>
				</div>

				<Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
					<CardHeader className="border-b border-border bg-card px-6 py-5">
						<div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
							<div>
								<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
									<Filter className="h-5 w-5 text-primary" />
									Senarai Kelas
								</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									Urus dan pantau semua kelas dalam sistem
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Badge variant="outline" className="border-primary/30 bg-primary/5 font-medium text-primary">
									<Filter className="mr-1 h-3 w-3" />
									{filteredRows.length} kelas
								</Badge>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6">
						<div className="mb-6 flex flex-col gap-4 lg:flex-row">
							<div className="relative flex-1">
								<Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Cari kelas atau guru kelas..."
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
									className="h-11 rounded-lg border-border bg-background pl-10 focus:border-primary focus:ring-primary/20"
								/>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<div className="w-full sm:w-[200px]">
									<Select value={filterGrade} onValueChange={setFilterGrade}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih Tingkatan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="default-grade-1">
												<div className="flex items-center gap-2">
													<GraduationCap className="h-4 w-4" />
													Tingkatan
												</div>
											</SelectItem>
											{[1, 2, 3, 4, 5].map((grade) => (
												<SelectItem key={grade} value={String(grade)}>
													<div className="flex items-center gap-2">
														<div
															className={`h-2 w-2 rounded-full ${
																grade === 1
																	? "bg-emerald-500"
																	: grade === 2
																		? "bg-blue-500"
																		: grade === 3
																			? "bg-amber-500"
																			: grade === 4
																				? "bg-purple-500"
																				: "bg-rose-500"
															}`}
														/>
														Tingkatan {grade}
													</div>
												</SelectItem>
											))}
										
										</SelectContent>
									</Select>
								</div>

								<div className="w-full sm:w-[180px]">
									<Select value={filterClassName} onValueChange={setFilterClassName}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih Kelas" />
										</SelectTrigger>
										<SelectContent className="max-h-72 overflow-y-auto rounded-lg border-border">
											<SelectItem value="all">
												<div className="flex items-center gap-2">
													<School className="h-4 w-4" />
													Semua Kelas
												</div>
											</SelectItem>
											{classNameOptions.map((className) => (
												<SelectItem key={className} value={className}>
													{className}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<Button
									variant="outline"
									onClick={() => {
										setSearchQuery("");
										setFilterGrade("default-grade-1");
										setFilterClassName("all");
									}}
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
											<TableHead className="w-16 py-4 text-center font-semibold text-foreground">#</TableHead>
											<TableHead className="py-4 font-semibold text-foreground">Tingkatan</TableHead>
											<TableHead className="py-4 font-semibold text-foreground">Nama Kelas</TableHead>
											<TableHead className="py-4 text-center font-semibold text-foreground">Bil. Pelajar</TableHead>
											<TableHead className="py-4 font-semibold text-foreground">Guru Kelas</TableHead>
											<TableHead className="py-4 pr-6 text-right font-semibold text-foreground">Tindakan</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loading ? (
											<TableRow>
												<TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
													Memuatkan lantikan guru kelas...
												</TableCell>
											</TableRow>
										) : paginatedRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
													Tiada kelas dijumpai.
												</TableCell>
											</TableRow>
										) : (
											paginatedRows.map((classItem, index) => {
												const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;

												return (
													<TableRow
														key={classItem.id}
														className="group border-b border-border transition-colors last:border-0 hover:bg-muted/50"
													>
														<TableCell className="py-4 text-center">
															<div className="font-medium text-muted-foreground transition-colors group-hover:text-primary">
																{displayIndex}
															</div>
														</TableCell>
														<TableCell className="py-4">
															<Badge
																variant="outline"
																className={`rounded-md px-3 py-1.5 font-medium ${getGradeColor(classItem.grade)}`}
															>
																Tingkatan {classItem.grade}
															</Badge>
														</TableCell>
														<TableCell className="py-4">
															<div className="flex items-center gap-3">
																<div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-xs">
																	<span className="text-sm font-semibold text-primary">
																		{classItem.name.charAt(0)}
																	</span>
																</div>
																<div className="font-semibold text-foreground transition-colors group-hover:text-primary">
																	{classItem.name}
																</div>
															</div>
														</TableCell>
														<TableCell className="py-4 text-center">
															<Badge
																variant="secondary"
																className={`px-3 py-1.5 font-semibold ${
																	classItem.studentCount > 0
																		? "border border-cyan-200 bg-cyan-100 text-indigo-700"
																		: "bg-gray-100 text-gray-500"
																}`}
															>
																<Users className="mr-1 h-3 w-3" />
																{classItem.studentCount} pelajar
															</Badge>
														</TableCell>
														<TableCell className="py-4">
															{classItem.teacherName ? (
																<div className="flex items-center gap-2">
																	<div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-100 shadow-sm">
																		<span className="text-sm font-semibold text-blue-600">
																			{classItem.teacherName.charAt(0)}
																		</span>
																	</div>
																	<div className="font-medium text-foreground">{classItem.teacherName}</div>
																</div>
															) : (
																<div className="flex items-center gap-2 text-muted-foreground">
																	<div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50">
																		<UserPlus className="h-4 w-4 text-gray-400" />
																	</div>
																	<span className="text-sm italic">Belum dilantik</span>
																</div>
															)}
														</TableCell>
														<TableCell className="py-4 pr-6 text-right">
															<Button
																size="icon"
																variant="outline"
																className="h-8 w-8 text-primary"
																onClick={() => {
																	setAssigning(classItem);
																	setSelectedTeacherId(classItem.teacherId || "");
																	setIsChangingClassTeacher(false);
																}}
																title={classItem.teacherId ? "Tukar guru kelas" : "Lantik guru kelas"}
																aria-label={classItem.teacherId ? "Tukar guru kelas" : "Lantik guru kelas"}
															>
																<UserPlus className="h-4 w-4" />
															</Button>
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
								<div className="flex flex-wrap items-center gap-2 text-muted-foreground">
									<div className="flex items-center gap-1">
										<span>Menunjukkan</span>
										<span className="font-semibold text-foreground">
											{filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
											{" - "}
											{Math.min(currentPage * PAGE_SIZE, filteredRows.length)}
										</span>
										<span>daripada</span>
										<span className="font-semibold text-foreground">{rows.length}</span>
										<span>kelas</span>
									</div>
									{filterGrade !== "all" && (
										<Badge variant="secondary" className="ml-2">
											Tingkatan {filterGrade === "default-grade-1" ? "1" : filterGrade}
										</Badge>
									)}
								</div>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Clock className="h-4 w-4" />
										<span>Kemas kini: <LastUpdatedTime /></span>
									</div>
									<Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-8">
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
													onClick={(event) => {
														event.preventDefault();
														setCurrentPage((page) => Math.max(1, page - 1));
													}}
													className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
												/>
											</PaginationItem>
											{paginationItems.map((item, index) => {
												if (typeof item !== "number") {
													return (
														<PaginationItem key={`${item}-${index}`}>
															<PaginationEllipsis />
														</PaginationItem>
													);
												}
												return (
													<PaginationItem key={item}>
														<PaginationLink
															href="#"
															isActive={currentPage === item}
															onClick={(event) => {
																event.preventDefault();
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
													onClick={(event) => {
														event.preventDefault();
														setCurrentPage((page) => Math.min(totalPages, page + 1));
													}}
													className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
												/>
											</PaginationItem>
										</PaginationContent>
									</Pagination>
								</div>
							)}
						</div>
					</div>
				</Card>
			</div>

			<Dialog
				open={Boolean(assigning)}
				onOpenChange={(open) => {
					if (!open) {
						setAssigning(null);
						setSelectedTeacherId("");
						setIsChangingClassTeacher(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<UserPlus className="h-5 w-5 text-primary" />
							Lantik Guru Kelas
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-5 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="flex items-center gap-1 text-muted-foreground">
									<Filter className="h-3.5 w-3.5" /> Tingkatan
								</Label>
								<div className="flex h-11 items-center rounded-md border border-border bg-muted/30 px-3 font-medium">
									Tingkatan {assigning?.grade}
								</div>
							</div>
							<div className="space-y-2">
								<Label className="flex items-center gap-1 text-muted-foreground">
									<School className="h-3.5 w-3.5" /> Nama Kelas
								</Label>
								<div className="flex h-11 items-center rounded-md border border-border bg-muted/30 px-3 font-medium">
									{assigning?.name}
								</div>
							</div>
						</div>
						<div className="space-y-2">
							<Label className="flex items-center gap-1">
								<UserPlus className="h-3.5 w-3.5" /> Pilih Guru Kelas <span className="text-red-500">*</span>
							</Label>
							<Select
								value={selectedTeacherId}
								onValueChange={setSelectedTeacherId}
								disabled={isClassTeacherSelectLocked}
							>
								<SelectTrigger className="h-11 border-border">
									<SelectValue placeholder="Pilih guru kelas" />
								</SelectTrigger>
								<SelectContent>
									{classTeacherOptions.length === 0 ? (
										<SelectItem value="none" disabled>Tiada guru kelas ditemui</SelectItem>
									) : (
										classTeacherOptions.map((teacher) => (
											<SelectItem key={teacher.id} value={teacher.id}>
												{teacher.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
							<p className="text-[11px] leading-relaxed text-amber-700 italic">
								<strong>Nota:</strong> Seorang guru boleh memegang tanggungjawab untuk <strong>satu (1) kelas</strong> sahaja pada satu masa.
							</p>
						</div>
					</div>
					<DialogFooter>
						<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								{assigning?.id && classTeacherByClassId[assigning.id] && (
									<Button
										type="button"
										variant="destructive"
										onClick={() => {
											setIsChangingClassTeacher(true);
											setSelectedTeacherId("");
										}}
										disabled={isChangingClassTeacher}
									>
										<UserPlus className="mr-2 h-4 w-4" />
										Tukar Guru Kelas
									</Button>
								)}
							</div>
							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={() => setAssigning(null)}>
									Batal
								</Button>
								<Button onClick={handleAssignClassTeacher} disabled={isAssignSaveDisabled} className="bg-primary px-8">
									Simpan
								</Button>
							</div>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
