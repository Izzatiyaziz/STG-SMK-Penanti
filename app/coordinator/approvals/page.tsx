"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
	Download,
	Eye,
	Filter,
	RefreshCw,
	Search,
	Shield,
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
		total: number;
		grade: string;
	}>;
};

type ApprovalResponse = {
	data?: Submission[];
	message?: string;
};

type SubjectResponse = {
	data?: Array<{ id?: unknown; name?: unknown }>;
};

function getTimeLabel() {
	return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
	if (!value) return "-";
	return new Date(value).toLocaleString("ms-MY");
}

function getStatusBadge(status: SubmissionStatus) {
	if (status === "pending") {
		return (
			<Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
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

export default function SubjectCoordinatorApprovalPage() {
	const PAGE_SIZE = 10;
	const router = useRouter();
	const [data, setData] = useState<Submission[]>([]);
	const [selected, setSelected] = useState<Submission | null>(null);
	const [loading, setLoading] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | SubmissionStatus>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [subjectName, setSubjectName] = useState("");

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
			setData(json?.data ?? []);
			if (!firstSubjectName && json?.data?.[0]?.subject) {
				setSubjectName(json.data[0].subject);
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
		let filtered = data;

		if (statusFilter !== "all") {
			filtered = filtered.filter((row) => row.status === statusFilter);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter((row) =>
				[
					row.subject,
					row.className,
					row.examName,
					row.academic_year,
					row.teacher,
				]
					.join(" ")
					.toLowerCase()
					.includes(query),
			);
		}

		return filtered;
	}, [data, searchQuery, statusFilter]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter]);

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
		window.print();
	}

	async function handleAction(submission: Submission, action: "approve" | "reject") {
		if (!submission.class_id) {
			toast.error("Kelas tidak dijumpai untuk hantaran ini");
			return;
		}

		const toastId = toast.loading(action === "approve" ? "Meluluskan..." : "Menolak...");

		try {
			const res = await fetch("/api/coordinator/approvals", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					subject_id: submission.subject_id,
					class_id: submission.class_id,
					exam_id: submission.exam_id,
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
			setData((prev) =>
				prev.map((row) =>
					row.id === submission.id ? { ...row, status: nextStatus } : row,
				),
			);
			await fetchApprovals();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
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
								<Shield className="w-3.5 h-3.5" />
								<span>Data Kelulusan Terkawal</span>
							</div>
							<div className="w-1 h-1 rounded-full bg-muted" />
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
							disabled={loading || filteredRows.length === 0}
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
								<Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-medium">
									<Clock className="w-3 h-3 mr-1" />
									{pendingCount} menunggu
								</Badge>
								<Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
									<Filter className="w-3 h-3 mr-1" />
									{filteredRows.length} hantaran ditemui
								</Badge>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-6">
						<div className="flex flex-col lg:flex-row gap-4 mb-6">
							<div className="flex-1 relative">
								<Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
								<Input
									placeholder="Cari subjek, kelas, peperiksaan atau guru..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
								/>
							</div>

							<div className="flex flex-col sm:flex-row gap-3">
								<div className="w-full sm:w-[220px]">
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
													<Filter className="w-4 h-4" />
													Semua Status
												</div>
											</SelectItem>
											<SelectItem value="pending">
												<div className="flex items-center gap-2">
													<div className="w-2 h-2 rounded-full bg-amber-500" />
													Menunggu
												</div>
											</SelectItem>
											<SelectItem value="approved">
												<div className="flex items-center gap-2">
													<div className="w-2 h-2 rounded-full bg-emerald-500" />
													Diluluskan
												</div>
											</SelectItem>
											<SelectItem value="rejected">
												<div className="flex items-center gap-2">
													<div className="w-2 h-2 rounded-full bg-rose-500" />
													Ditolak
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<Button
									variant="outline"
									onClick={() => {
										setSearchQuery("");
										setStatusFilter("all");
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
												Subjek
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Kelas
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Peperiksaan
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4">
												Guru
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
												<TableCell colSpan={8} className="py-16">
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
												<TableCell colSpan={8} className="py-16">
													<div className="flex flex-col items-center justify-center gap-4">
														<div className="p-4 rounded-full bg-muted/50">
															<ClipboardCheck className="w-12 h-12 text-muted-foreground/50" />
														</div>
														<div className="text-center">
															<p className="font-semibold text-foreground">Tiada hantaran dijumpai</p>
															<p className="text-sm text-muted-foreground mt-1 max-w-md">
																{searchQuery || statusFilter !== "all"
																	? "Tiada hantaran yang sepadan dengan carian anda"
																	: "Belum ada markah dihantar untuk semakan"}
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
															<div className="font-semibold text-foreground group-hover:text-primary transition-colors">
																{submission.subject || "-"}
															</div>
										</TableCell>
														<TableCell className="py-4">
															{submission.class_id
																? `${submission.classGrade || ""} ${submission.className || ""}`.trim() || "-"
																: "-"}
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
															{formatDate(submission.submittedAt)}
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
									{statusFilter !== "all" && (
										<Badge variant="secondary" className="ml-2">
											{statusFilter === "pending"
												? "Menunggu"
												: statusFilter === "approved"
													? "Diluluskan"
													: "Ditolak"}
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

				<div className="text-center pt-6">
					<div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
						<Shield className="w-4 h-4" />
						<span>Sistem Kelulusan Markah v2.0 - Data kelulusan terkawal sepenuhnya</span>
					</div>
				</div>
			</div>

			<Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[820px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-bold">
							<Eye className="w-5 h-5 text-primary" />
							Semakan Markah {selected?.className ? `- ${selected.className}` : ""}
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
									<p className="text-xs text-muted-foreground">Guru</p>
									<p className="font-semibold text-foreground">{selected.teacher || "-"}</p>
								</div>
							</div>

							<div className="rounded-lg border border-border overflow-hidden">
								<div className="overflow-x-auto">
									<Table>
										<TableHeader className="bg-muted/30">
											<TableRow className="hover:bg-transparent border-b border-border">
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
											{selected.marks.map((mark) => {
												const invalid = Number(mark.total) > 100;
												return (
													<TableRow
														key={mark.result_id}
														className={`border-b border-border last:border-0 ${invalid ? "bg-rose-50" : "hover:bg-muted/50"}`}
													>
														<TableCell className="py-4 font-medium">
															{mark.student}
														</TableCell>
														<TableCell className="py-4 text-center">
															<div className="space-y-1 text-left">
																{mark.components.map((component) => (
																	<div key={component.key} className="flex justify-between gap-3 text-sm">
																		<span>{component.label}</span>
																		<span className="font-medium">
																			{component.mark}/{component.max_mark || "-"}
																		</span>
																	</div>
																))}
															</div>
														</TableCell>
														<TableCell className="py-4 text-center font-semibold">
															{mark.total}%
														</TableCell>
														<TableCell className="py-4 text-center">
															{mark.grade || "-"}
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
									onClick={() => selected && handleAction(selected, "reject")}
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
		</div>
	);
}
