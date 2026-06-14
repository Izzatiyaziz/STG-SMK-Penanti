"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMalaysiaTime } from "@/lib/date-utils";
import { exportTablePDF } from "@/lib/export-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	BookOpen,
	Clock,
	ClipboardList,
	Download,
	Filter,
	GraduationCap,
	RefreshCw,
	School,
	Search,
	UserMinus,
	UserPlus,
} from "lucide-react";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
};

type Subject = { id: string; name: string };
type TeacherSubjectLoad = {
	subject_id: string;
	subject_name: string;
	class_count: number;
	classes: string[];
};
type Teacher = { id: string; name: string; subject_load?: TeacherSubjectLoad[] };
type ClassRow = { id: string; name: string; grade: number };
type Assignment = { id: string; teacher_id: string; class_id: string };

type CoordinatorAssignmentData = {
	subject: Subject | null;
	coordinator: { id: string; name: string } | null;
	classes: ClassRow[];
	teachers: Teacher[];
	assignments: Assignment[];
};

type SubjectResponse = {
	data?: { id?: unknown; name?: unknown }[];
};

type ApiMessage = {
	message?: string;
};

const MAX_CLASSES_PER_SUBJECT_TEACHER = 3;

function getTimeLabel() {
	return formatMalaysiaTime();
}

function normalizeSubjectName(value: unknown) {
	return String(value ?? "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function isUpperFormOnlySubject(subjectName: unknown) {
	const name = normalizeSubjectName(subjectName);
	if (!name) return false;

	return (
		/\bbiologi\b/.test(name) ||
		/\bkimia\b/.test(name) ||
		/\bfizik\b/.test(name) ||
		/\bperniagaan\b/.test(name) ||
		/\bakaun\b/.test(name) ||
		/\bperakaunan\b/.test(name) ||
		name.includes("matematik tambahan") ||
		name.includes("additional mathematics")
	);
}

const LastUpdatedTime = () => {
	const [time, setTime] = useState(() => getTimeLabel());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(getTimeLabel());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
};

export default function SubjectCoordinatorAssignmentsPage() {
	const PAGE_SIZE = 10;
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);

	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [selectedSubjectId, setSelectedSubjectId] = useState("");
	const [data, setData] = useState<CoordinatorAssignmentData | null>(null);
	const [loading, setLoading] = useState(false);
	const [savingClassId, setSavingClassId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterGrade, setFilterGrade] = useState("default-grade-1");
	const [currentPage, setCurrentPage] = useState(1);
	const [assigning, setAssigning] = useState<ClassRow | null>(null);
	const [selectedTeacherId, setSelectedTeacherId] = useState("");

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

		const role = String(session.role ?? "").toLowerCase().trim();
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
				const json = (await res.json()) as SubjectResponse;
				const list: Subject[] = (json?.data ?? [])
					.map((s) => ({
						id: String(s.id ?? ""),
						name: String(s.name ?? ""),
					}))
					.filter((s: Subject) => Boolean(s.id));

				if (cancelled) return;
				setSubjects(list);
				if (!selectedSubjectId && list.length > 0) setSelectedSubjectId(list[0].id);
			} catch {
				if (!cancelled) setSubjects([]);
			}
		}

		loadSubjects();
		return () => {
			cancelled = true;
		};
	}, [router, session, sessionReady, selectedSubjectId]);

	async function fetchAssignmentData(subjectId = selectedSubjectId) {
		if (!session || !subjectId) return;

		setLoading(true);
		try {
			const res = await fetch(
				`/api/coordinator/teacher-subject?coordinator_teacher_id=${session.user_id}&subject_id=${subjectId}`,
			);
			const json = (await res.json()) as CoordinatorAssignmentData;
			if (!res.ok) {
				toast.error((json as ApiMessage)?.message ?? "Gagal memuatkan data");
				return;
			}
			setData(json);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!session || !selectedSubjectId) return;
		fetchAssignmentData(selectedSubjectId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, selectedSubjectId]);

	const selectedSubject = useMemo(
		() => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
		[subjects, selectedSubjectId]
	);
	const isUpperFormSubject = isUpperFormOnlySubject(
		data?.subject?.name ?? selectedSubject?.name
	);
	const defaultFilterGrade = isUpperFormSubject ? "default-grade-4" : "default-grade-1";
	const defaultGradeNumber = isUpperFormSubject ? 4 : 1;

	useEffect(() => {
		setSearchQuery("");
		setFilterGrade(defaultFilterGrade);
		setCurrentPage(1);
		setAssigning(null);
		setSelectedTeacherId("");
	}, [selectedSubjectId, defaultFilterGrade]);

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
	function formatTeacherSubjectLoad(subjectLoad?: TeacherSubjectLoad[]) {
		if (!subjectLoad || subjectLoad.length === 0) return "Belum ada lantikan subjek";
		return subjectLoad
			.map((item) => `${item.subject_name} (${item.class_count} kelas)`)
			.join(", ");
	}

	function getTeacherTotalClassCount(subjectLoad?: TeacherSubjectLoad[]) {
		return (subjectLoad ?? []).reduce((total, item) => total + item.class_count, 0);
	}

	const dropdownTeachers = useMemo(() => {
		const currentTeacherId = assigning?.id
			? assignmentTeacherByClassId.get(assigning.id)
			: "";
		return (data?.teachers ?? []).filter((teacher) => {
			if (teacher.id === currentTeacherId) return true;
			return getTeacherTotalClassCount(teacher.subject_load) < MAX_CLASSES_PER_SUBJECT_TEACHER;
		});
	}, [assignmentTeacherByClassId, assigning?.id, data?.teachers]);

	const filteredRows = useMemo(() => {
		let filtered = data?.classes ?? [];
		const effectiveFilterGrade = filterGrade.startsWith("default-grade-")
			? String(defaultGradeNumber)
			: filterGrade;

		if (effectiveFilterGrade !== "all") {
			filtered = filtered.filter((row) => row.grade === Number(effectiveFilterGrade));
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter((row) => {
				const assignedTeacherId = assignmentTeacherByClassId.get(row.id) ?? "";
				const assignedTeacherName = teacherNameById.get(assignedTeacherId) ?? "";
				return [row.name, assignedTeacherName]
					.join(" ")
					.toLowerCase()
					.includes(query);
			});
		}

		return filtered;
	}, [
		assignmentTeacherByClassId,
		data?.classes,
		defaultGradeNumber,
		filterGrade,
		searchQuery,
		teacherNameById,
	]);

	const gradeOptions = useMemo(() => {
		return Array.from(new Set([defaultGradeNumber, ...(data?.classes ?? []).map((row) => row.grade)]))
			.filter((grade) => Number.isFinite(Number(grade)))
			.sort((a, b) => Number(a) - Number(b));
	}, [data?.classes, defaultGradeNumber]);

	const filterGradeLabel =
		filterGrade === "default-grade-1"
			? "1"
			: filterGrade === "default-grade-4"
				? "4"
				: filterGrade;

	useEffect(() => {
		setCurrentPage(1);
	}, [filterGrade, searchQuery]);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
		if (currentPage > totalPages) setCurrentPage(totalPages);
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

		if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
		if (currentPage >= totalPages - 2) {
			return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
		}

		return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages] as const;
	}, [currentPage, totalPages]);

	const getGradeColor = (grade: number) => {
		switch (grade) {
			case 1:
				return "bg-emerald-100 text-emerald-700 border-emerald-200";
			case 2:
				return "bg-blue-100 text-blue-700 border-blue-200";
			case 3:
				return "bg-amber-100 text-amber-700 border-amber-200";
			case 4:
				return "bg-purple-100 text-purple-700 border-purple-200";
			case 5:
				return "bg-rose-100 text-rose-700 border-rose-200";
			default:
				return "bg-gray-100 text-gray-700 border-gray-200";
		}
	};

	const getGradeDotColor = (grade: number) => {
		switch (grade) {
			case 1:
				return "bg-emerald-500";
			case 2:
				return "bg-blue-500";
			case 3:
				return "bg-amber-500";
			case 4:
				return "bg-purple-500";
			case 5:
				return "bg-rose-500";
			default:
				return "bg-gray-500";
		}
	};

	function openAssignDialog(classItem: ClassRow) {
		setAssigning(classItem);
		setSelectedTeacherId(assignmentTeacherByClassId.get(classItem.id) ?? "");
	}

	function handleExport() {
		const subject = data?.subject?.name ?? selectedSubject?.name ?? "Subjek";
		const exportRows = [...(data?.classes ?? [])].sort(
			(a, b) => a.grade - b.grade || a.name.localeCompare(b.name),
		);
		exportTablePDF({
			title: "Senarai Tugasan Guru Subjek",
			subtitle: `Subjek: ${subject} | Tingkatan 1-5 | Jumlah: ${exportRows.length} kelas`,
			fileName: `tugasan-guru-${subject}.pdf`,
			columns: [
				{ header: "Bil.", dataKey: "no" },
				{ header: "Tingkatan", dataKey: "grade" },
				{ header: "Kelas", dataKey: "className" },
				{ header: "Guru Subjek", dataKey: "teacher" },
				{ header: "Status", dataKey: "status" },
			],
			rows: exportRows.map((classItem, index) => {
				const teacherId = assignmentTeacherByClassId.get(classItem.id) ?? "";
				const teacher = teacherNameById.get(teacherId) ?? "";
				return {
					no: index + 1,
					grade: `Tingkatan ${classItem.grade}`,
					className: classItem.name,
					teacher: teacher || "-",
					status: teacher ? "Telah Dilantik" : "Belum Dilantik",
				};
			}),
		});
		toast.success("PDF tugasan guru berjaya dieksport");
	}

	async function saveAssignmentForClass() {
		if (!session || !selectedSubjectId || !assigning) return;

		setSavingClassId(assigning.id);
		const toastId = toast.loading("Menyimpan...");
		try {
			const res = await fetch("/api/coordinator/teacher-subject", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					coordinator_teacher_id: session.user_id,
					subject_id: selectedSubjectId,
					class_id: assigning.id,
					teacher_id: selectedTeacherId,
				}),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal", { id: toastId });
				return;
			}

			toast.success("Disimpan", { id: toastId });
			setAssigning(null);
			setSelectedTeacherId("");
			await fetchAssignmentData();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		} finally {
			setSavingClassId(null);
		}
	}

	async function removeAssignmentForClass() {
		if (!session || !selectedSubjectId || !assigning) return;

		setSavingClassId(assigning.id);
		const toastId = toast.loading("Membuang lantikan...");
		try {
			const res = await fetch("/api/coordinator/teacher-subject", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					coordinator_teacher_id: session.user_id,
					subject_id: selectedSubjectId,
					class_id: assigning.id,
					teacher_id: "",
				}),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal", { id: toastId });
				return;
			}

			toast.success("Buang lantikan", { id: toastId });
			setAssigning(null);
			setSelectedTeacherId("");
			await fetchAssignmentData();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		} finally {
			setSavingClassId(null);
		}
	}

	if (!sessionReady) return null;
	if (!session) return null;

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
								<ClipboardList className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-foreground">
									Pengurusan Guru Subjek
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Melantik guru subjek mengikut kelas yang ditetapkan
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>Kemas kini: <LastUpdatedTime /></span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs sm:w-auto sm:max-w-[260px]">
							<BookOpen className="h-4 w-4 shrink-0 text-primary" />
							<span className="truncate">
								{data?.subject?.name ?? subjects[0]?.name ?? "Tiada subjek"}
							</span>
						</div>
						<Button
							variant="outline"
							onClick={() => fetchAssignmentData()}
							disabled={loading || !selectedSubjectId}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							{loading ? (
								<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4 mr-2" />
							)}
							Muat Semula
						</Button>
						<Button
							variant="outline"
							onClick={handleExport}
							disabled={loading || (data?.classes.length ?? 0) === 0}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							<Download className="w-4 h-4 mr-2" />
							Eksport
						</Button>
					</div>
				</div>

				<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
					<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div>
								<CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
									<Filter className="w-5 h-5 text-primary" />
									Senarai Kelas
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Urus lantikan guru subjek bagi {data?.subject?.name ?? "subjek dipilih"}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<Badge variant="outline" className="h-8 rounded-full border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
									<Filter className="mr-1.5 h-3.5 w-3.5" />
									{filteredRows.length} kelas
								</Badge>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6">
						<div className="flex flex-col lg:flex-row gap-4 mb-6">
							<div className="flex-1 relative">
								<Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
								<Input
									placeholder="Cari kelas atau guru subjek..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
								/>
							</div>

							<div className="flex flex-col sm:flex-row gap-3">
								<div className="w-full sm:w-[200px]">
									<Select value={filterGrade} onValueChange={setFilterGrade}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih Tingkatan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value={defaultFilterGrade}>
												<div className="flex items-center gap-2">
													<GraduationCap className="w-4 h-4" />
													Tingkatan
												</div>
											</SelectItem>
											{gradeOptions.map((grade) => (
												<SelectItem key={grade} value={String(grade)}>
													<div className="flex items-center gap-2">
														<div className={`w-2 h-2 rounded-full ${getGradeDotColor(grade)}`} />
														Tingkatan {grade}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<Button
									variant="outline"
									onClick={() => {
										setSearchQuery("");
										setFilterGrade(defaultFilterGrade);
									}}
									className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
								>
									Reset
								</Button>
							</div>
						</div>

						<div className="rounded-lg border border-border overflow-hidden">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader className="bg-muted/30">
										<TableRow className="hover:bg-transparent border-b border-border">
											<TableHead className="font-semibold text-foreground py-4 w-16 text-center">
												#
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Tingkatan
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Nama Kelas
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Guru Subjek
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-right pr-6">
												Tindakan
											</TableHead>
										</TableRow>
									</TableHeader>

									<TableBody>
										{loading ? (
											<TableRow>
												<TableCell colSpan={5} className="py-16">
													<div className="flex flex-col items-center justify-center gap-4">
														<RefreshCw className="w-10 h-10 animate-spin text-primary" />
														<div className="text-center">
															<p className="font-semibold text-foreground">Memuatkan data kelas...</p>
															<p className="text-sm text-muted-foreground mt-1">Sila tunggu sebentar</p>
														</div>
													</div>
												</TableCell>
											</TableRow>
										) : filteredRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={5} className="py-16">
													<div className="flex flex-col items-center justify-center gap-4">
														<div className="p-4 rounded-full bg-muted/50">
															<School className="w-12 h-12 text-muted-foreground/50" />
														</div>
														<div className="text-center">
															<p className="font-semibold text-foreground">Tiada kelas dijumpai</p>
															<p className="text-sm text-muted-foreground mt-1 max-w-md">
																{searchQuery || filterGrade !== "all"
																	? "Tiada kelas atau guru subjek yang sepadan dengan carian anda"
																	: "Tiada kelas tersedia untuk subjek ini"}
															</p>
														</div>
													</div>
												</TableCell>
											</TableRow>
										) : (
											paginatedRows.map((classItem, index) => {
												const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
												const assignedTeacherId = assignmentTeacherByClassId.get(classItem.id) ?? "";
												const assignedTeacherName = assignedTeacherId
													? teacherNameById.get(assignedTeacherId) ?? ""
													: "";

												return (
													<TableRow
														key={classItem.id}
														className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
													>
														<TableCell
															className="py-4 text-center cursor-pointer"
															onClick={() => openAssignDialog(classItem)}
														>
															<div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
																{displayIndex}
															</div>
														</TableCell>
														<TableCell className="py-4">
															<Badge className={`border ${getGradeColor(classItem.grade)}`}>
																Tingkatan {classItem.grade}
															</Badge>
														</TableCell>
														<TableCell
															className="py-4 cursor-pointer"
															onClick={() => openAssignDialog(classItem)}
														>
															<div className="flex items-center gap-3">
																<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
																	<span className="font-semibold text-primary text-sm">
																		{classItem.name.charAt(0)}
																	</span>
																</div>
																<div className="font-semibold text-foreground group-hover:text-primary transition-colors">
																	{classItem.name}
																</div>
															</div>
														</TableCell>
														<TableCell className="py-4">
															{assignedTeacherName ? (
																<div className="flex items-center gap-2">
																	<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm border border-blue-200">
																		<span className="text-blue-600 font-semibold text-sm">
																			{assignedTeacherName.charAt(0)}
																		</span>
																	</div>
																	<div className="font-medium text-foreground">
																		{assignedTeacherName}
																	</div>
																</div>
															) : (
																<div className="flex items-center gap-2 text-muted-foreground">
																	<div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-dashed border-gray-300">
																		<UserPlus className="w-4 h-4 text-gray-400" />
																	</div>
																	<span className="italic text-sm">Belum dilantik</span>
																</div>
															)}
														</TableCell>
														<TableCell className="py-4 text-right pr-6">
															<div className="flex justify-end gap-2">
																<Button
																	size="icon"
																	variant="outline"
																	className="h-8 w-8 text-primary"
																	onClick={() => openAssignDialog(classItem)}
																	title={assignedTeacherId ? "Tukar guru subjek" : "Lantik guru subjek"}
																	aria-label={assignedTeacherId ? "Tukar guru subjek" : "Lantik guru subjek"}
																>
																	<UserPlus className="w-4 h-4" />
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
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
								<div className="flex items-center gap-2 text-muted-foreground">
									<div className="flex items-center gap-1">
										<span className="font-semibold text-foreground">{filteredRows.length}</span>
										<span>daripada</span>
										<span className="font-semibold text-foreground">{data?.classes.length ?? 0}</span>
										<span>kelas dipaparkan</span>
									</div>
									{filterGrade !== "all" && (
										<Badge variant="secondary" className="ml-2">
											Tingkatan {filterGradeLabel}
										</Badge>
									)}
								</div>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Clock className="w-4 h-4" />
										<span>Kemas kini: <LastUpdatedTime /></span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => fetchAssignmentData()}
										disabled={loading || !selectedSubjectId}
										className="h-8"
									>
										{loading && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
										Muat Semula Data
									</Button>
								</div>
							</div>

							{!loading && totalPages > 1 && (
								<div className="flex flex-col gap-3 border-t border-border/60 pt-4">
									<div className="text-sm text-muted-foreground">
										Menunjukkan {(currentPage - 1) * PAGE_SIZE + 1}
										{" - "}
										{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} daripada {filteredRows.length} kelas
									</div>
									<Pagination>
										<PaginationContent>
											<PaginationItem>
												<PaginationPrevious
													href="#"
													onClick={(e) => {
														e.preventDefault();
														setCurrentPage((page) => Math.max(1, page - 1));
													}}
													className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
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
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<UserPlus className="w-5 h-5 text-primary" />
							Lantikan Guru Subjek
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-5 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="flex items-center gap-1 text-muted-foreground">
									<School className="w-3.5 h-3.5" /> Nama Kelas
								</Label>
								<div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
									{assigning?.name}
								</div>
							</div>
							<div className="space-y-2">
								<Label className="flex items-center gap-1 text-muted-foreground">
									<Filter className="w-3.5 h-3.5" /> Tingkatan
								</Label>
								<div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
									Tingkatan {assigning?.grade}
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="flex items-center gap-1">
								<ClipboardList className="w-3.5 h-3.5" /> Subjek
							</Label>
							<div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
								{data?.subject?.name ?? ""}
							</div>
						</div>

						<div className="space-y-2">
							<Label className="flex items-center gap-1">
								<UserPlus className="w-3.5 h-3.5" /> Pilih Guru Subjek <span className="text-red-500">*</span>
							</Label>
							<Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
								<SelectTrigger className="h-11 border-border">
									<SelectValue placeholder="Pilih guru subjek" />
								</SelectTrigger>
								<SelectContent>
									{dropdownTeachers.length === 0 ? (
										<SelectItem value="none" disabled>Tiada guru subjek ditemui</SelectItem>
									) : (
										dropdownTeachers.map((teacher) => (
											<SelectItem
												key={teacher.id}
												value={teacher.id}
												textValue={teacher.name}
											>
												<div className="flex min-w-0 flex-col gap-1 py-1">
													<span className="truncate font-medium">{teacher.name}</span>
													<span className="truncate text-xs text-muted-foreground">
														{formatTeacherSubjectLoad(teacher.subject_load)}
													</span>
												</div>
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								{assigning?.id && assignmentTeacherByClassId.has(assigning.id) && (
									<Button
										type="button"
										variant="destructive"
										onClick={removeAssignmentForClass}
										disabled={savingClassId === assigning.id}
									>
										<UserMinus className="w-4 h-4 mr-2" />
										Buang Lantikan
									</Button>
								)}
							</div>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setAssigning(null)}
								>
									Batal
								</Button>
								<Button
									onClick={saveAssignmentForClass}
									disabled={!selectedTeacherId || savingClassId === assigning?.id}
									className="bg-primary px-8"
								>
									{savingClassId === assigning?.id ? "Menyimpan..." : "Simpan"}
								</Button>
							</div>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
