"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type TeacherOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };
type ClassOption = { id: string; name: string; grade: number };

type AssignmentRow = {
	id: string;
	teacher_id: string;
	teacher_name: string;
	subject_id: string;
	subject_name: string;
	class_id: string;
	class_name: string;
	grade: number | null;
};

export default function AdminAssignmentsPage() {
	const [teachers, setTeachers] = useState<TeacherOption[]>([]);
	const [subjects, setSubjects] = useState<SubjectOption[]>([]);
	const [classes, setClasses] = useState<ClassOption[]>([]);
	const [rows, setRows] = useState<AssignmentRow[]>([]);
	const [loading, setLoading] = useState(false);

	const [teacherId, setTeacherId] = useState("");
	const [subjectId, setSubjectId] = useState("");
	const [classId, setClassId] = useState("");

	const canSubmit = teacherId && subjectId && classId;

	const classLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of classes) map.set(c.id, `T${c.grade} • ${c.name}`);
		return map;
	}, [classes]);

	async function loadOptions() {
		try {
			const [tRes, sRes, cRes] = await Promise.all([
				fetch("/api/admin/users?role=teacher"),
				fetch("/api/admin/subjects"),
				fetch("/api/admin/classes"),
			]);

			const [tJson, sJson, cJson] = await Promise.all([
				tRes.json(),
				sRes.json(),
				cRes.json(),
			]);

			setTeachers(
				(Array.isArray(tJson) ? tJson : []).map(
					(t: { id: string; name: string }) => ({
						id: t.id,
						name: t.name,
					}),
				),
			);
			setSubjects(
				(Array.isArray(sJson) ? sJson : []).map(
					(s: { id: string; name: string }) => ({
						id: s.id,
						name: s.name,
					}),
				),
			);
			setClasses(
				(Array.isArray(cJson) ? cJson : []).map(
					(c: { id: string; name: string; grade: number }) => ({
						id: c.id,
						name: c.name,
						grade: c.grade ?? 0,
					}),
				),
			);
		} catch {
			// ignore
		}
	}

	async function loadAssignments() {
		setLoading(true);
		try {
			const res = await fetch("/api/admin/teacher-subject");
			const json = await res.json();
			setRows(json?.data ?? []);
		} catch {
			setRows([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadOptions();
		loadAssignments();
	}, []);

	async function handleAdd() {
		if (!canSubmit) return;
		const toastId = toast.loading("Menyimpan...");

		try {
			const res = await fetch("/api/admin/teacher-subject", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					teacher_id: teacherId,
					subject_id: subjectId,
					class_id: classId,
				}),
			});

			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal menyimpan", { id: toastId });
				return;
			}

			toast.success("Berjaya diassign", { id: toastId });
			setTeacherId("");
			setSubjectId("");
			setClassId("");
			loadAssignments();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	async function handleDelete(id: string) {
		const toastId = toast.loading("Memadam...");
		try {
			const res = await fetch(`/api/admin/teacher-subject?id=${id}`, {
				method: "DELETE",
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal memadam", { id: toastId });
				return;
			}
			toast.success("Dipadam", { id: toastId });
			loadAssignments();
		} catch {
			toast.error("Ralat sistem", { id: toastId });
		}
	}

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6">
				<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
					Pentadbiran
				</p>
				<h1 className="!text-[36px] font-black leading-tight text-foreground">
					Tugasan
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Tetapkan guru kepada subjek dan kelas.
				</p>
			</div>

			<Card className="shadow-lg border border-border/50">
				<CardHeader>
					<CardTitle>Tambah Assignment</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
					<Select value={teacherId} onValueChange={setTeacherId}>
						<SelectTrigger>
							<SelectValue placeholder="Pilih Guru" />
						</SelectTrigger>
						<SelectContent>
							{teachers.map((t) => (
								<SelectItem key={t.id} value={t.id}>
									{t.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={subjectId} onValueChange={setSubjectId}>
						<SelectTrigger>
							<SelectValue placeholder="Pilih Subjek" />
						</SelectTrigger>
						<SelectContent>
							{subjects.map((s) => (
								<SelectItem key={s.id} value={s.id}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={classId} onValueChange={setClassId}>
						<SelectTrigger>
							<SelectValue placeholder="Pilih Kelas" />
						</SelectTrigger>
						<SelectContent>
							{classes.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{classLabelById.get(c.id) ?? c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button onClick={handleAdd} disabled={!canSubmit}>
						Simpan
					</Button>
				</CardContent>
			</Card>

			<Card className="shadow-lg border border-border/50">
				<CardHeader>
					<CardTitle>Senarai Assignment</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Guru</TableHead>
								<TableHead>Subjek</TableHead>
								<TableHead>Kelas</TableHead>
								<TableHead className="text-right">Tindakan</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={r.id}>
									<TableCell>{r.teacher_name}</TableCell>
									<TableCell>{r.subject_name}</TableCell>
									<TableCell>
										{r.grade ? `T${r.grade} • ` : ""}
										{r.class_name}
									</TableCell>
									<TableCell className="text-right">
										<Button
											size="sm"
											variant="destructive"
											onClick={() => handleDelete(r.id)}
										>
											Padam
										</Button>
									</TableCell>
								</TableRow>
							))}

							{!loading && rows.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center text-muted-foreground py-10"
									>
										Tiada assignment.
									</TableCell>
								</TableRow>
							)}
							{loading && (
								<TableRow>
									<TableCell
										colSpan={4}
										className="text-center text-muted-foreground py-10"
									>
										Memuatkan...
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
