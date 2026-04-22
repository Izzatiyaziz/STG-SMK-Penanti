"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Pencil,
  Trash2,
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Shield,
  Clock,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  UserCheck,
  UserCircle,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SubjectItem } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ✅ Client-side only time component */
const LastUpdatedTime = () => {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return <span className="font-medium text-primary">{time || "Loading..."}</span>;
};

type CoordinatorTeacher = {
  id: string;
  name: string;
  email?: string | null;
  roles?: string[];
};

type SubjectWithCoordinator = SubjectItem & { coordinatorName?: string };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithCoordinator[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [deleting, setDeleting] = useState<SubjectItem | null>(null);

  const [detailsSubject, setDetailsSubject] = useState<SubjectItem | null>(null);
  const [coordinatorTeachers, setCoordinatorTeachers] = useState<CoordinatorTeacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "studentCount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ================= FETCH DATA (GABUNGAN 3 SUMBER) =================
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil data subjek (stg_subjects)
      const res = await fetch("/api/admin/subjects");
      const dataSubjects: SubjectItem[] = await res.json();

      // 2. Ambil data pemetaan (stg_subject_cordinator)
      const mappingRes = await fetch("/api/admin/subject-coordinator");
      const mappings = await mappingRes.json();

      // 3. Ambil data guru (users role subject coordinator)
      const teacherRes = await fetch("/api/admin/users?role=subject coordinator");
      const allCoordinators: CoordinatorTeacher[] = await teacherRes.json();

      // 4. Proses pemetaan untuk mendapatkan nama guru
      const processedData = dataSubjects.map((sub: any) => {
        // Cari rekod pemetaan bagi subjek ini
        const mapping = mappings.find((m: any) => m.subject_id === sub.id);
        
        // Cari nama guru berdasarkan teacher_id dalam pemetaan tersebut
        const teacherObj = allCoordinators.find((t) => t.id === mapping?.teacher_id);

        return {
          ...sub,
          coordinatorName: teacherObj ? teacherObj.name : "Belum Dilantik",
        };
      });

      setSubjects(processedData);
    } catch (error) {
      console.error("FETCH ERROR:", error);
      toast.error("Gagal memuatkan senarai subjek");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // ================= FILTER AND SORT =================
  const filteredSubjects = subjects
    .filter((subject) =>
      subject.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const valA = sortBy === "name" ? a.name.toLowerCase() : (a as any).studentCount || 0;
      const valB = sortBy === "name" ? b.name.toLowerCase() : (b as any).studentCount || 0;
      return sortOrder === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

  // ================= ACTIONS =================
  async function handleAddSubject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_name: formData.get("subject_name") }),
      });
      if (res.ok) {
        toast.success("Subjek berjaya ditambah ✅");
        fetchSubjects();
        (document.getElementById("close-add-dialog") as any)?.click();
      }
    } catch { toast.error("Ralat sistem"); } finally { setLoading(false); }
  }

  async function handleEditSubject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: editing.id, subject_name: formData.get("subject_name") }),
      });
      if (res.ok) {
        toast.success("Subjek dikemaskini ✅");
        setEditing(null);
        fetchSubjects();
      }
    } catch { toast.error("Gagal"); } finally { setLoading(false); }
  }

  async function handleDeleteSubject() {
    if (!deleting) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subjects?id=${deleting.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Subjek dipadam 🗑️");
        setDeleting(null);
        fetchSubjects();
      }
    } catch { toast.error("Gagal"); } finally { setLoading(false); }
  }

  async function fetchCoordinatorTeachers() {
    setLoadingTeachers(true);
    try {
      const res = await fetch("/api/admin/users?role=subject coordinator");
      const data = await res.json();
      if (res.ok) setCoordinatorTeachers(data);
    } catch { toast.error("Gagal memuatkan guru"); } finally { setLoadingTeachers(false); }
  }

  function openDetails(subject: SubjectItem) {
    setDetailsSubject(subject);
    setSelectedCoordinatorId("");
    fetchCoordinatorTeachers();
  }

  async function handleAppointCoordinator() {
    if (!detailsSubject || !selectedCoordinatorId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subject-coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: detailsSubject.id, teacher_id: selectedCoordinatorId }),
      });
      if (res.ok) {
        toast.success("Penyelaras berjaya dilantik ✅");
        setDetailsSubject(null);
        fetchSubjects();
      }
    } catch { toast.error("Ralat sistem"); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Pengurusan Subjek</h1>
                <p className="text-muted-foreground font-medium mt-1">Urus dan pantau semua subjek dalam sistem</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /><span>Data Terurus</span></div>
              <div className="w-1 h-1 rounded-full bg-muted" />
              <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>Kemas kini: <LastUpdatedTime /></span></div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchSubjects} disabled={loading} className="border-border hover:bg-accent shadow-xs">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"><Plus className="w-4 h-4 mr-2" />Tambah Subjek</Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Tambah Subjek Baharu</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Masukkan nama subjek untuk sistem.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSubject} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Nama Subjek</Label>
                    <Input name="subject_name" placeholder="Contoh: Matematik" className="border-border focus:border-primary" required />
                  </div>
                  <DialogFooter className="pt-4">
                    <DialogClose asChild><Button id="close-add-dialog" type="button" variant="outline">Batal</Button></DialogClose>
                    <Button type="submit" disabled={loading}>Simpan</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* MAIN TABLE CARD */}
        <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" /> Senarai Subjek
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Urus semua subjek yang berdaftar</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">{filteredSubjects.length} rekod ditemui</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="mb-6 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama subjek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20" />
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => { setSortBy("name"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }} className="p-0 h-auto font-semibold hover:bg-transparent">
                          Nama Subjek
                          {sortBy === "name" && (sortOrder === "asc" ? <SortAsc className="w-3.5 h-3.5 ml-1 text-primary" /> : <SortDesc className="w-3.5 h-3.5 ml-1 text-primary" />)}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Guru Penyelaras Subjek</TableHead>
                      <TableHead className="font-semibold text-foreground py-4 text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary inline" /></TableCell></TableRow>
                    ) : filteredSubjects.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="py-16 text-center text-muted-foreground">Tiada subjek dijumpai</TableCell></TableRow>
                    ) : (
                      filteredSubjects.map((subject, index) => (
                        <TableRow key={subject.id} className="hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                          <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-bold text-foreground">{subject.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className={`w-4 h-4 ${subject.coordinatorName === "Belum Dilantik" ? "text-muted-foreground" : "text-orange-500"}`} />
                              <span className={`text-sm font-medium ${subject.coordinatorName === "Belum Dilantik" ? "text-muted-foreground italic" : "text-foreground"}`}>
                                {subject.coordinatorName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openDetails(subject)} className="h-8 w-8 p-0 border-border hover:bg-accent hover:text-primary" title="Lantik Penyelaras">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditing(subject)} className="h-8 w-8 p-0 border-border hover:bg-accent hover:text-primary">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleting(subject)} className="h-8 w-8 p-0">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
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

        {/* DIALOG LANTIK PENYELARAS */}
        <Dialog open={!!detailsSubject} onOpenChange={() => setDetailsSubject(null)}>
          <DialogContent className="rounded-xl max-w-lg border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" /> Maklumat Subjek
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">Lantik guru penyelaras untuk subjek ini.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <p className="text-xs text-muted-foreground">Nama Subjek</p>
                <p className="font-bold text-foreground">{detailsSubject?.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Guru Penyelaras</Label>
                <Select value={selectedCoordinatorId} onValueChange={setSelectedCoordinatorId}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder={loadingTeachers ? "Memuatkan..." : "Pilih penyelaras..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinatorTeachers.length === 0 ? (
                      <SelectItem value="none" disabled>Tiada guru penyelaras dijumpai</SelectItem>
                    ) : (
                      coordinatorTeachers.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Hanya guru dengan peranan <b>penyelaras subjek</b> dipaparkan.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDetailsSubject(null)} className="border-border">Tutup</Button>
              <Button onClick={handleAppointCoordinator} disabled={loading || !selectedCoordinatorId} className="gap-2 bg-primary">
                <UserCheck className="w-4 h-4" /> Lantik Penyelaras
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDIT */}
        <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
          <DialogContent className="rounded-lg border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Kemas Kini Subjek</DialogTitle>
              <DialogDescription>Ubah nama subjek yang dipilih.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubject} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-medium">Nama Subjek</Label>
                <Input name="subject_name" defaultValue={editing?.name} className="border-border focus:border-primary" required />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setEditing(null)}>Batal</Button>
                <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Perubahan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG DELETE */}
        <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
          <DialogContent className="rounded-lg border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Padam Subjek
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Anda pasti ingin memadam subjek <b className="text-foreground">{deleting?.name}</b>? Tindakan ini tidak boleh diundur.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={handleDeleteSubject} disabled={loading}>
                {loading ? "Memadam..." : "Ya, Padam Subjek"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}