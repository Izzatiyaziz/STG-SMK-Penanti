"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMalaysiaDate, formatMalaysiaDateTime, formatMalaysiaTime } from "@/lib/date-utils";
import { exportTablePDF } from "@/lib/export-pdf";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
	CheckCircle,
	Clock,
	ClipboardCheck,
	ClipboardList,
	Download,
	Eye,
	Filter,
	GraduationCap,
	RefreshCw,
	School,
	Loader2,
	UserRound,
	XCircle,
} from "lucide-react";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
};

type SubmissionStatus = "pending" | "approved" | "rejected";

type Submission = {
	id: string;
	subject: string;
	subject_id: string;
	class_id: string | null;
	className: string;
	classGrade: number;
	teacher_id: string | null;
	teacher: string;
	exam_id: string;
	examName: string;
	academic_year: string;
	status: SubmissionStatus;
	submittedAt: string | null;
	deadline: string | null;
	lateDays: number;
	rejectionReason: string | null;
	markingClosed: boolean;
	marks: Array<{
		result_id: string;
		student: string;
		student_id: string;
		components: Array<{
			key: string;
			label: string;
			type: string;
			mark: number;
			max_mark: number;
			included_in_total: boolean;
		}>;
		total: number | null;
		grade: string;
	}>;
};

function isHiddenCoordinatorSubmission(submission: Submission) {
	return (
		submission.academic_year.trim() === "2025" &&
		submission.examName.trim().toLowerCase() === "peperiksaan akhir tahun"
	);
}

type ApprovalResponse = {
	data?: Submission[];
	message?: string;
};

type SubjectResponse = {
	data?: Array<{ id?: unknown; name?: unknown }>;
};

type ApprovalDeepLink = {
	subjectId: string;
	classId: string;
	teacherId: string;
	examId: string;
	grade: string;
	open: boolean;
};

function getTimeLabel() {
	return formatMalaysiaTime();
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

function formatDate(value: string | null) {
	return formatMalaysiaDateTime(value);
}

function formatClassLabel(submission: Pick<Submission, "class_id" | "classGrade" | "className">) {
	if (!submission.class_id) return "-";
	return `${submission.classGrade || ""} ${submission.className || ""}`.trim() || "-";
}

function formatComponentMark(component: Submission["marks"][number]["components"][number]) {
	return component.max_mark > 0 ? `${component.mark}/${component.max_mark}` : String(component.mark);
}

function getStatusBadge(status: SubmissionStatus) {
	if (status === "pending") {
		return (
			<Badge variant="outline" className="border-violet-200 bg-violet-100 text-violet-700">
				Menunggu
			</Badge>
		);
	}

	if (status === "approved") {
		return (
			<Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">
				Diluluskan
			</Badge>
		);
	}

	return (
		<Badge className="border border-rose-200 bg-rose-100 text-rose-700">
			Ditolak
		</Badge>
	);
}

function getGradeDotColor(grade: number) {
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
}

export default function SubjectCoordinatorApprovalPage() {
	const PAGE_SIZE = 10;
	const router = useRouter();
	const [data, setData] = useState<Submission[]>([]);
	const [selected, setSelected] = useState<Submission | null>(null);
	const [loading, setLoading] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);
	const [gradeFilter, setGradeFilter] = useState("select-grade");
	const [statusFilter, setStatusFilter] = useState<"all" | SubmissionStatus>("all");
	const [subjectFilter, setSubjectFilter] = useState("all");
	const [classFilter, setClassFilter] = useState("all");
	const [examFilter, setExamFilter] = useState("select-exam");
	const [teacherFilter, setTeacherFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [subjectName, setSubjectName] = useState("");
	const [deepLink, setDeepLink] = useState<ApprovalDeepLink | null>(null);
	const [deepLinkHandled, setDeepLinkHandled] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");
	const [rejectingSubmission, setRejectingSubmission] = useState<Submission | null>(null);
	const [rejectLoading, setRejectLoading] = useState(false);
	const [updatingMarkingStatus, setUpdatingMarkingStatus] = useState(false);

	useEffect(() => {
		setRejectionReason(selected?.status === "rejected" ? selected.rejectionReason ?? "" : "");
	}, [selected]);

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
		const params = new URLSearchParams(window.location.search);
		const nextDeepLink = {
			subjectId: String(params.get("subject_id") ?? "").trim(),
			classId: String(params.get("class_id") ?? "").trim(),
			teacherId: String(params.get("teacher_id") ?? "").trim(),
			examId: String(params.get("exam_id") ?? "").trim(),
			grade: String(params.get("grade") ?? "").trim(),
			open: params.get("open") === "1",
		};

		if (
			nextDeepLink.subjectId ||
			nextDeepLink.classId ||
			nextDeepLink.teacherId ||
			nextDeepLink.examId ||
			nextDeepLink.grade
		) {
			setDeepLink(nextDeepLink);
		}
	}, []);

	async function fetchApprovals() {
		if (!session) return;

		setLoading(true);
		try {
			const subjectRequest = fetch(
				`/api/coordinator/subjects?teacher_id=${session.user_id}`,
			)
				.then((res) => (res.ok ? res.json() : null))
				.catch(() => null);
			const res = await fetch(`/api/coordinator/approvals?teacher_id=${session.user_id}&status=all`);
			const json = (await res.json()) as ApprovalResponse;
			const subjectJson = (await subjectRequest) as SubjectResponse | null;
			const firstSubjectName = subjectJson?.data?.[0]?.name;
			if (firstSubjectName) setSubjectName(String(firstSubjectName));
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal memuatkan data");
				setData([]);
				return;
			}
			const visibleData = (json?.data ?? []).filter(
				(submission) => !isHiddenCoordinatorSubmission(submission),
			);
			setData(visibleData);
			if (!firstSubjectName && visibleData[0]?.subject) {
				setSubjectName(visibleData[0].subject);
			}
		} catch {
			setData([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!sessionReady) return;

		if (!session) {
			router.replace("/login");
			return;
		}

		if (String(session.role).toLowerCase().trim() !== "subject coordinator") {
			toast.error("Anda tidak dibenarkan akses halaman ini");
			router.replace("/teacher/dashboard");
			return;
		}

		fetchApprovals();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router, session, sessionReady]);

	const filteredRows = useMemo(() => {
		if (
			gradeFilter === "select-grade" ||
			examFilter === "select-exam"
		) return [];

		let filtered = data;

		if (subjectFilter !== "all") {
			filtered = filtered.filter((row) => row.subject_id === subjectFilter);
		}

		if (statusFilter !== "all") {
			filtered = filtered.filter((row) => row.status === statusFilter);
		}

		filtered = filtered.filter((row) => String(row.classGrade) === gradeFilter);
		if (classFilter !== "all") {
			filtered = filtered.filter((row) => (row.class_id || formatClassLabel(row)) === classFilter);
		}
		filtered = filtered.filter((row) => row.exam_id === examFilter);

		if (teacherFilter !== "all") {
			filtered = filtered.filter((row) => (row.teacher_id || row.teacher) === teacherFilter);
		}

		return filtered;
	}, [classFilter, data, examFilter, gradeFilter, statusFilter, subjectFilter, teacherFilter]);

	const gradeOptions = useMemo(() => {
		return Array.from(
			new Set(
				data
					.map((row) => String(row.classGrade || "").trim())
					.filter(Boolean),
			),
		).sort((a, b) => Number(a) - Number(b));
	}, [data]);

	const classOptions = useMemo(() => {
		if (gradeFilter === "select-grade") return [];
		const options = new Map<string, string>();
		for (const row of data.filter((item) => {
			if (subjectFilter !== "all" && item.subject_id !== subjectFilter) return false;
			if (String(item.classGrade) !== gradeFilter) return false;
			return teacherFilter === "all" || (item.teacher_id || item.teacher) === teacherFilter;
		})) {
			const label = formatClassLabel(row);
			if (label !== "-") options.set(row.class_id || label, label);
		}
		return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data, gradeFilter, subjectFilter, teacherFilter]);

	useEffect(() => {
		if (data.length === 0) return;
		if (classFilter === "all") return;
		if (classOptions.some(([value]) => value === classFilter)) return;
		setClassFilter("all");
		setExamFilter("select-exam");
	}, [classFilter, classOptions, data.length]);

	const examOptions = useMemo(() => {
		const options = new Map<string, string>();
		for (const row of data.filter((item) => {
			if (gradeFilter === "select-grade") return false;
			if (String(item.classGrade) !== gradeFilter) return false;
			if (teacherFilter !== "all" && (item.teacher_id || item.teacher) !== teacherFilter) return false;
			return classFilter === "all" || (item.class_id || formatClassLabel(item)) === classFilter;
		})) {
			if (row.exam_id && row.examName) {
				options.set(row.exam_id, `${row.examName} (${row.academic_year})`);
			}
		}
		return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
	}, [classFilter, data, gradeFilter, teacherFilter]);

	const teacherOptions = useMemo(() => {
		const options = new Map<string, string>();
		for (const row of data.filter((item) => {
			if (gradeFilter === "select-grade") return false;
			return String(item.classGrade) === gradeFilter;
		})) {
			if (row.teacher) options.set(row.teacher_id || row.teacher, row.teacher);
		}
		return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
	}, [data, gradeFilter]);

	useEffect(() => {
		if (teacherFilter === "all") return;
		if (teacherOptions.some(([value]) => value === teacherFilter)) return;
		setTeacherFilter("all");
	}, [teacherFilter, teacherOptions]);

	const selectedMarkingRows = useMemo(
		() =>
			data.filter(
				(row) =>
					String(row.classGrade) === gradeFilter &&
					row.exam_id === examFilter &&
					(subjectFilter === "all" || row.subject_id === subjectFilter),
			),
		[data, examFilter, gradeFilter, subjectFilter],
	);
	const markingClosed = selectedMarkingRows.some((row) => row.markingClosed);
	const canManageMarking =
		gradeFilter !== "select-grade" &&
		examFilter !== "select-exam" &&
		selectedMarkingRows.length > 0;

	async function toggleMarkingStatus() {
		const selectedRow = selectedMarkingRows[0];
		if (!selectedRow || !canManageMarking) return;
		setUpdatingMarkingStatus(true);
		try {
			const response = await fetch("/api/coordinator/marking-status", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					exam_id: selectedRow.exam_id,
					subject_id: selectedRow.subject_id,
					grade: Number(gradeFilter),
					closed: !markingClosed,
				}),
			});
			const json = await response.json();
			if (!response.ok) {
				toast.error(json?.message || "Gagal mengemas kini status pemarkahan");
				return;
			}
			setData((current) =>
				current.map((row) =>
					row.exam_id === selectedRow.exam_id &&
					row.subject_id === selectedRow.subject_id &&
					String(row.classGrade) === gradeFilter
						? { ...row, markingClosed: !markingClosed }
						: row,
				),
			);
			toast.success(markingClosed ? "Pemarkahan dibuka semula" : `Pemarkahan Tingkatan ${gradeFilter} ditutup`);
		} catch {
			toast.error("Ralat mengemas kini status pemarkahan");
		} finally {
			setUpdatingMarkingStatus(false);
		}
	}

	useEffect(() => {
		setCurrentPage(1);
	}, [classFilter, examFilter, gradeFilter, statusFilter, subjectFilter, teacherFilter]);

	useEffect(() => {
		if (!deepLink || deepLinkHandled || data.length === 0) return;

		if (deepLink.subjectId) setSubjectFilter(deepLink.subjectId);
		if (deepLink.grade) setGradeFilter(deepLink.grade);
		if (deepLink.classId) setClassFilter(deepLink.classId);
		if (deepLink.examId) setExamFilter(deepLink.examId);
		if (deepLink.teacherId) setTeacherFilter(deepLink.teacherId);

		const matched = data.find((row) => {
			if (deepLink.subjectId && row.subject_id !== deepLink.subjectId) return false;
			if (deepLink.classId && row.class_id !== deepLink.classId) return false;
			if (deepLink.examId && row.exam_id !== deepLink.examId) return false;
			if (deepLink.teacherId && row.teacher_id !== deepLink.teacherId) return false;
			return true;
		});

		if (matched) {
			setSubjectName(matched.subject || subjectName);
			if (deepLink.open) setSelected(matched);
		} else if (deepLink.open) {
			toast.error("Tiada hantaran markah dijumpai untuk kelas dan guru subjek ini");
		}

		setDeepLinkHandled(true);
	}, [data, deepLink, deepLinkHandled, subjectName]);

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

	const pendingCount = data.filter((row) => row.status === "pending").length;

	function handleExport() {
		const statusLabel: Record<SubmissionStatus, string> = {
			pending: "Menunggu",
			approved: "Diluluskan",
			rejected: "Ditolak",
		};
		const exportRows = data
			.filter((row) => row.classGrade >= 1 && row.classGrade <= 5)
			.filter((row) => subjectFilter === "all" || row.subject_id === subjectFilter)
			.filter((row) => statusFilter === "all" || row.status === statusFilter)
			.sort(
				(a, b) =>
					a.classGrade - b.classGrade ||
					formatClassLabel(a).localeCompare(formatClassLabel(b)) ||
					a.examName.localeCompare(b.examName),
			);
		exportTablePDF({
			title: "Senarai Semakan Hantaran Markah",
			subtitle: `Subjek: ${subjectName || "Semua Subjek"} | Tingkatan 1-5 | Jumlah: ${exportRows.length} hantaran`,
			fileName: `semakan-hantaran-${subjectName || "subjek"}.pdf`,
			columns: [
				{ header: "Bil.", dataKey: "no" },
				{ header: "Kelas", dataKey: "className" },
				{ header: "Peperiksaan", dataKey: "exam" },
				{ header: "Guru Subjek", dataKey: "teacher" },
				{ header: "Tarikh Hantar", dataKey: "submittedAt" },
				{ header: "Status", dataKey: "status" },
			],
			rows: exportRows.map((submission, index) => ({
				no: index + 1,
				className: formatClassLabel(submission),
				exam: submission.examName
					? `${submission.examName} (${submission.academic_year})`
					: "-",
				teacher: submission.teacher || "-",
				submittedAt: formatDate(submission.submittedAt),
				status: `${statusLabel[submission.status]}${submission.lateDays > 0 ? `, Lewat ${submission.lateDays} hari` : ""}`,
			})),
		});
		toast.success("PDF semakan hantaran berjaya dieksport");
	}

	async function handleAction(submission: Submission, action: "approve" | "reject") {
		if (!submission.class_id) {
			toast.error("Kelas tidak dijumpai untuk hantaran ini");
			return;
		}

		const toastId = toast.loading(action === "approve" ? "Meluluskan..." : "Menolak...");
		if (action === "reject") setRejectLoading(true);

		try {
			const res = await fetch("/api/coordinator/approvals", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					subject_id: submission.subject_id,
					class_id: submission.class_id,
					exam_id: submission.exam_id,
					teacher_id: submission.teacher_id,
					rejection_reason: action === "reject" ? rejectionReason.trim() : "",
				}),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal", { id: toastId });
				return;
			}

			const nextStatus = action === "approve" ? "approved" : "rejected";
			const updatedCount = Number(json?.updated ?? 0);
			toast.success(
				action === "approve"
					? `Diluluskan${updatedCount > 0 ? ` (${updatedCount} rekod)` : ""}`
					: `Ditolak${updatedCount > 0 ? ` (${updatedCount} rekod)` : ""}`,
				{ id: toastId },
			);
			setSelected(null);
			setRejectingSubmission(null);
			setRejectionReason("");
			setData((prev) =>
				prev.map((row) =>
					row.id === submission.id ? { ...row, status: nextStatus } : row,
				),
			);
			await fetchApprovals();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		} finally {
			if (action === "reject") setRejectLoading(false);
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
								<ClipboardCheck className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-foreground">
									Semakan & Meluluskan Markah
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Semak markah yang dihantar oleh Guru Subjek sebelum diluluskan
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
							<span className="truncate">{subjectName || "Subjek"}</span>
						</div>
						<Button
							variant="outline"
							onClick={fetchApprovals}
							disabled={loading}
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
							disabled={loading || data.length === 0}
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
									Senarai Hantaran
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Urus status kelulusan markah mengikut kelas dan peperiksaan
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<div
									className="flex h-10 items-center gap-3 rounded-full border border-border bg-background px-3 shadow-xs"
									title={canManageMarking ? `Pemarkahan Tingkatan ${gradeFilter}` : "Pilih tingkatan dan peperiksaan"}
								>
									<div className="leading-tight">
										<div className="text-xs font-semibold text-foreground">
											{gradeFilter === "select-grade" ? "Pemarkahan" : `Pemarkahan T${gradeFilter}`}
										</div>
										<div className={`text-[11px] font-medium ${markingClosed ? "text-rose-600" : "text-emerald-600"}`}>
											{canManageMarking ? (markingClosed ? "Ditutup" : "Dibuka") : "Pilih peperiksaan"}
										</div>
									</div>
									<button
										type="button"
										role="switch"
										aria-label={`Buka atau tutup pemarkahan Tingkatan ${gradeFilter}`}
										aria-checked={canManageMarking && !markingClosed}
										disabled={!canManageMarking || updatingMarkingStatus}
										onClick={toggleMarkingStatus}
										className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
											canManageMarking && !markingClosed ? "bg-emerald-500" : "bg-muted-foreground/30"
										}`}
									>
										<span className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
											canManageMarking && !markingClosed ? "translate-x-5" : "translate-x-0.5"
										}`}>
											{updatingMarkingStatus ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
										</span>
									</button>
								</div>
								<Badge variant="outline" className="h-8 rounded-full border-violet-200 bg-violet-100 px-3 text-sm font-medium text-violet-700">
									<Clock className="mr-1.5 h-3.5 w-3.5" />
									{pendingCount} menunggu
								</Badge>
								<Badge variant="outline" className="h-8 rounded-full border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
									<Filter className="mr-1.5 h-3.5 w-3.5" />
									{filteredRows.length} hantaran
								</Badge>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6">
						<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Tingkatan</div>
									<Select
										value={gradeFilter}
										onValueChange={(value) => {
											setGradeFilter(value);
											setTeacherFilter("all");
											setClassFilter("all");
											setExamFilter("select-exam");
										}}
									>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih tingkatan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="select-grade">
												<div className="flex items-center gap-2">
													<GraduationCap className="h-4 w-4" />
													Tingkatan
												</div>
											</SelectItem>
											{gradeOptions.map((grade) => (
												<SelectItem key={grade} value={grade}>
													<div className="flex items-center gap-2">
														<div className={`h-2 w-2 rounded-full ${getGradeDotColor(Number(grade))}`} />
														Tingkatan {grade}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Guru Subjek</div>
									<Select
										value={teacherFilter}
										disabled={gradeFilter === "select-grade"}
										onValueChange={(value) => {
											setTeacherFilter(value);
											setClassFilter("all");
											setExamFilter("select-exam");
										}}
									>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih guru" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="all">
												<div className="flex items-center gap-2">
													<UserRound className="h-4 w-4" />
													Semua Guru
												</div>
											</SelectItem>
											{teacherOptions.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Kelas</div>
									<Select
										value={classFilter}
										disabled={gradeFilter === "select-grade"}
										onValueChange={(value) => {
											setClassFilter(value);
											setExamFilter("select-exam");
										}}
									>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih kelas" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="all">
												<div className="flex items-center gap-2">
													<School className="h-4 w-4" />
													Semua Kelas
												</div>
											</SelectItem>
											{classOptions.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Peperiksaan</div>
									<Select
										value={examFilter}
										disabled={gradeFilter === "select-grade"}
										onValueChange={setExamFilter}
									>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih peperiksaan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="select-exam">
												<div className="flex items-center gap-2">
													<ClipboardList className="h-4 w-4" />
													Peperiksaan
												</div>
											</SelectItem>
											{examOptions.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Status</div>
									<Select
										value={statusFilter}
										onValueChange={(value) => setStatusFilter(value as "all" | SubmissionStatus)}
									>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih status" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="all">
												<div className="flex items-center gap-2">
													<Filter className="h-4 w-4" />
													Semua Status
												</div>
											</SelectItem>
											<SelectItem value="pending">
												<div className="flex items-center gap-2">
													<div className="h-2 w-2 rounded-full bg-violet-500" />
													Menunggu
												</div>
											</SelectItem>
											<SelectItem value="approved">
												<div className="flex items-center gap-2">
													<div className="h-2 w-2 rounded-full bg-emerald-500" />
													Diluluskan
												</div>
											</SelectItem>
											<SelectItem value="rejected">
												<div className="flex items-center gap-2">
													<div className="h-2 w-2 rounded-full bg-rose-500" />
													Ditolak
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-end">
									<Button
										variant="outline"
										onClick={() => {
											setGradeFilter("select-grade");
											setClassFilter("all");
											setExamFilter("select-exam");
											setTeacherFilter("all");
											setStatusFilter("all");
											setSubjectFilter("all");
										}}
										className="h-11 rounded-lg border-border px-5 hover:bg-accent hover:text-accent-foreground"
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
												Kelas
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Peperiksaan
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Guru Subjek
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Tarikh
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-center">
												Status
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
														<RefreshCw className="w-10 h-10 animate-spin text-primary" />
														<div className="text-center">
															<p className="font-semibold text-foreground">Memuatkan data kelulusan...</p>
															<p className="text-sm text-muted-foreground mt-1">Sila tunggu sebentar</p>
														</div>
													</div>
												</TableCell>
											</TableRow>
										) : filteredRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={7} className="py-16">
													<div className="flex flex-col items-center justify-center gap-4">
														<div className="p-4 rounded-full bg-muted/50">
															<ClipboardCheck className="w-12 h-12 text-muted-foreground/50" />
														</div>
														<div className="text-center">
															<p className="font-semibold text-foreground">
																{gradeFilter === "select-grade" ||
																examFilter === "select-exam"
																	? "Pilih filter untuk melihat keputusan"
																	: "Tiada hantaran dijumpai"}
															</p>
															<p className="text-sm text-muted-foreground mt-1 max-w-md">
																{gradeFilter === "select-grade"
																	? "Pilih tingkatan untuk memaparkan pilihan guru"
																	: examFilter === "select-exam"
																			? "Pilih peperiksaan untuk memaparkan hantaran"
																	: "Tiada hantaran yang sepadan dengan carian anda"}
															</p>
														</div>
													</div>
												</TableCell>
											</TableRow>
										) : (
											paginatedRows.map((submission, index) => {
												const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
												return (
													<TableRow
														key={submission.id}
														className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
													>
														<TableCell className="py-4 text-center">
															<div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
																{displayIndex}
															</div>
														</TableCell>
														<TableCell className="py-4">
															{formatClassLabel(submission)}
														</TableCell>
														<TableCell className="py-4">
															{submission.examName
																? `${submission.examName} (${submission.academic_year})`
																: "-"}
														</TableCell>
														<TableCell className="py-4">
															{submission.teacher || "-"}
														</TableCell>
														<TableCell className="py-4">
															<div>{formatDate(submission.submittedAt)}</div>
															{submission.lateDays > 0 && (
																<Badge className="mt-1 border border-amber-200 bg-amber-100 text-amber-800">
																	Lewat {submission.lateDays} hari
																</Badge>
															)}
														</TableCell>
														<TableCell className="py-4 text-center">
															{getStatusBadge(submission.status)}
														</TableCell>
														<TableCell className="py-4 text-right pr-6">
															<div className="flex justify-end gap-2">
																<Button
																	size="icon"
																	variant="outline"
																	className="h-8 w-8 text-primary"
																	onClick={() => setSelected(submission)}
																	title="Lihat semakan"
																	aria-label="Lihat semakan"
																>
																	<Eye className="w-4 h-4" />
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
										<span className="font-semibold text-foreground">{data.length}</span>
										<span>hantaran dipaparkan</span>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Clock className="w-4 h-4" />
										<span>Kemas kini: <LastUpdatedTime /></span>
									</div>
									
									<Button
										variant="ghost"
										size="sm"
										onClick={fetchApprovals}
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
									<div className="text-sm text-muted-foreground">
										Menunjukkan {(currentPage - 1) * PAGE_SIZE + 1}
										{" - "}
										{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} daripada {filteredRows.length} hantaran
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

			<Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[820px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<Eye className="w-5 h-5 text-primary" />
							Semakan Markah {selected ? `- ${formatClassLabel(selected)}` : ""}
						</DialogTitle>
					</DialogHeader>

					{selected && (
						<div className="space-y-5 py-4">
							<div className="grid gap-3 sm:grid-cols-3">
								<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
									<p className="text-xs text-muted-foreground">Subjek</p>
									<p className="font-semibold text-foreground">{selected.subject || "-"}</p>
								</div>
								<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
									<p className="text-xs text-muted-foreground">Peperiksaan</p>
									<p className="font-semibold text-foreground">
										{selected.examName ? `${selected.examName} (${selected.academic_year})` : "-"}
									</p>
								</div>
								<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
									<p className="text-xs text-muted-foreground">Guru Subjek</p>
									<p className="font-semibold text-foreground">{selected.teacher || "-"}</p>
								</div>
							</div>

							{selected.lateDays > 0 && (
								<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
									<strong>Hantaran lewat {selected.lateDays} hari.</strong>{" "}
									Tarikh akhir: {selected.deadline ? formatMalaysiaDate(selected.deadline) : "-"}.
								</div>
							)}

							{selected.status === "rejected" && selected.rejectionReason && (
								<div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
									<p className="text-xs font-semibold uppercase text-rose-700">Sebab Penolakan</p>
									<p className="mt-1 text-sm text-rose-900">{selected.rejectionReason}</p>
								</div>
							)}

							<div className="rounded-lg border border-border overflow-hidden">
								<div className="overflow-x-auto">
									<Table>
										<TableHeader className="bg-muted/30">
											<TableRow className="hover:bg-transparent border-b border-border">
												<TableHead className="w-16 py-4 text-center font-semibold text-foreground">
													#
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4">
													Pelajar
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4 text-center">
													Komponen
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4 text-center">
													Jumlah
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4 text-center">
													Gred
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{selected.marks.map((mark, index) => {
												const hasMark = mark.total !== null;
												const invalid = hasMark && Number(mark.total) > 100;
												return (
													<TableRow
														key={mark.result_id}
														className={`border-b border-border last:border-0 ${invalid ? "bg-rose-50" : "hover:bg-muted/50"}`}
													>
														<TableCell className="py-4 text-center text-muted-foreground">
															{index + 1}
														</TableCell>
														<TableCell className="py-4 font-medium">
															{mark.student}
														</TableCell>
														<TableCell className="py-4 text-center">
															{mark.components.length > 0 ? (
																<div className="space-y-1 text-left">
																	{mark.components.map((component) => (
																		<div key={component.key} className="flex justify-between gap-3 text-sm">
																			<span>{component.label}</span>
																			<span className="font-medium">
																				{formatComponentMark(component)}
																			</span>
																		</div>
																	))}
																</div>
															) : (
																<Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
																	Belum diisi
																</Badge>
															)}
														</TableCell>
														<TableCell className="py-4 text-center font-semibold">
															{hasMark ? `${mark.total}%` : "-"}
														</TableCell>
														<TableCell className="py-4 text-center">
															{hasMark ? mark.grade || "-" : "-"}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</div>

						</div>
					)}

					<DialogFooter>
						<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>{selected ? getStatusBadge(selected.status) : null}</div>
							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={() => setSelected(null)}>
									Tutup
								</Button>
								<Button
									variant="destructive"
									onClick={() => {
										if (!selected) return;
										setRejectionReason("");
										setRejectingSubmission(selected);
									}}
									disabled={!selected || selected.status !== "pending"}
								>
									<XCircle className="w-4 h-4 mr-2" />
									Tolak
								</Button>
								<Button
									onClick={() => selected && handleAction(selected, "approve")}
									disabled={!selected || selected.status !== "pending"}
									className="bg-primary px-8"
								>
									<CheckCircle className="w-4 h-4 mr-2" />
									Lulus
								</Button>
							</div>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(rejectingSubmission)}
				onOpenChange={(open) => {
					if (open || rejectLoading) return;
					setRejectingSubmission(null);
					setRejectionReason("");
				}}
			>
				<DialogContent className="sm:max-w-[520px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-destructive">
							<XCircle className="h-5 w-5" />
							Sebab Penolakan Markah
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-3">
						<p className="text-sm text-muted-foreground">
							Nyatakan sebab markah untuk kelas{" "}
							<strong className="text-foreground">
								{rejectingSubmission ? formatClassLabel(rejectingSubmission) : "-"}
							</strong>{" "}
							ditolak. Sebab ini akan dipaparkan kepada Guru Subjek.
						</p>
						<div className="space-y-2">
							<label htmlFor="rejection-reason" className="text-sm font-semibold text-foreground">
								Sebab penolakan
							</label>
							<Textarea
								id="rejection-reason"
								value={rejectionReason}
								onChange={(event) => setRejectionReason(event.target.value)}
								placeholder="Contoh: Markah beberapa pelajar tidak lengkap dan perlu disemak semula."
								maxLength={500}
								disabled={rejectLoading}
								autoFocus
							/>
							<p className="text-right text-xs text-muted-foreground">
								{rejectionReason.length}/500
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={rejectLoading}
							onClick={() => {
								setRejectingSubmission(null);
								setRejectionReason("");
							}}
						>
							Batal
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={!rejectingSubmission || !rejectionReason.trim() || rejectLoading}
							onClick={() => rejectingSubmission && handleAction(rejectingSubmission, "reject")}
						>
							<XCircle className="mr-2 h-4 w-4" />
							{rejectLoading ? "Menolak..." : "Sahkan Penolakan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
