"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Backpack,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Building2,
  Shield,
  Clock,
  Filter,
  SortAsc,
  SortDesc,
  Users,
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
import { ClassItem } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

/* ✅ Helper to determine Grade from IC */
const getTingkatanFromIC = (ic: string) => {
  const clean = (ic || "").replace(/[^0-9]/g, "");
  if (clean.length < 2) return null;
  const yy = parseInt(clean.slice(0, 2), 10);
  const currentYear = new Date().getFullYear();
  const birthYear = yy <= (currentYear % 100) ? 2000 + yy : 1900 + yy;
  const tingkatan = currentYear - birthYear - 12;
  return (tingkatan >= 1 && tingkatan <= 5) ? tingkatan : null;
};

type ClassWithCount = ClassItem & { 
  studentCount?: number; 
  teacherName?: string;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [allClassesData, setAllClassesData] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState<ClassItem | null>(null);
  
  const [detailsClass, setDetailsClass] = useState<ClassWithCount | null>(null);
  const [classTeachers, setClassTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "studentCount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTingkatan, setSelectedTingkatan] = useState<string>("Tingkatan 1");

  // ================= FETCH DATA KELAS & GURU =================
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const allRes = await fetch(`/api/admin/classes`);
      const allClassData: ClassItem[] = await allRes.json();

      const studentRes = await fetch("/api/admin/users?role=student");
      const allStudents = await studentRes.json();

      const teacherRes = await fetch("/api/admin/users?role=class teacher");
      const allTeachers = await teacherRes.json();

      const processedAll = allClassData.map((cls) => {
        const count = (allStudents || []).filter((s: any) => 
          s.className === cls.name && getTingkatanFromIC(s.identifier)?.toString() === cls.grade?.toString()
        ).length;

        const teacherObj = allTeachers.find((t: any) => t.id === (cls as any).teacher_id);

        return { 
          ...cls, 
          studentCount: count,
          teacherName: teacherObj ? teacherObj.name : "Belum Dilantik" 
        };
      });

      setAllClassesData(processedAll);

      const gradeDigit = selectedTingkatan.replace(/[^0-9]/g, "");
      const filtered = processedAll.filter(c => c.grade?.toString() === gradeDigit);
      
      setClasses(filtered);
    } catch {
      toast.error("Gagal memuatkan senarai kelas");
    } finally {
      setLoading(false);
    }
  }, [selectedTingkatan]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // ================= FETCH GURU UNTUK MODAL =================
  async function fetchClassTeachers() {
    setLoadingTeachers(true);
    try {
      const res = await fetch("/api/admin/users?role=class teacher");
      const data = await res.json();
      if (res.ok) setClassTeachers(data);
    } catch {
      toast.error("Gagal memuatkan senarai guru kelas");
    } finally {
      setLoadingTeachers(false);
    }
  }

  function openDetails(cls: ClassWithCount) {
    setDetailsClass(cls);
    setSelectedTeacherId("");
    fetchClassTeachers();
  }

  // ================= STATS =================
  const gradeStats = useMemo(() => {
    const stats = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
    allClassesData.forEach(cls => {
      const g = cls.grade?.toString();
      if (g === "1") stats.T1 += cls.studentCount || 0;
      else if (g === "2") stats.T2 += cls.studentCount || 0;
      else if (g === "3") stats.T3 += cls.studentCount || 0;
      else if (g === "4") stats.T4 += cls.studentCount || 0;
      else if (g === "5") stats.T5 += cls.studentCount || 0;
    });
    return stats;
  }, [allClassesData]);

  // ================= FILTER & SORT =================
  const filteredTableData = useMemo(() => {
    return classes
      .filter((cls) => cls.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const valA = sortBy === "name" ? a.name.toLowerCase() : (a.studentCount || 0);
        const valB = sortBy === "name" ? b.name.toLowerCase() : (b.studentCount || 0);
        return sortOrder === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
  }, [classes, searchQuery, sortBy, sortOrder]);

  // ================= ACTIONS =================
  async function handleAddClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            class_name: formData.get("class_name"), 
            grade: formData.get("grade") 
        }),
      });
      if (res.ok) {
        toast.success("Kelas berjaya ditambah ✅");
        fetchClasses();
        (document.getElementById("close-add-dialog") as any)?.click();
      }
    } catch { toast.error("Ralat sistem"); } finally { setLoading(false); }
  }

  async function handleAppointClassTeacher() {
    if (!detailsClass || !selectedTeacherId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/class-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: detailsClass.id, teacher_id: selectedTeacherId }),
      });
      if (res.ok) {
        toast.success("Guru kelas berjaya dilantik ✅");
        setDetailsClass(null);
        fetchClasses();
      }
    } catch { toast.error("Ralat sistem"); } finally { setLoading(false); }
  }

  async function handleEditClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: editing.id, class_name: formData.get("class_name") }),
      });
      if (res.ok) { toast.success("Dikemaskini ✅"); setEditing(null); fetchClasses(); }
    } catch { toast.error("Gagal"); } finally { setLoading(false); }
  }

  async function handleDeleteClass() {
    if (!deleting) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/classes?id=${deleting.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Dipadam 🗑️"); setDeleting(null); fetchClasses(); }
    } catch { toast.error("Gagal"); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER - MATCHING SUBJECTS UI */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <Backpack className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Pengurusan Kelas</h1>
                <p className="text-muted-foreground font-medium mt-1">Urus dan pantau senarai kelas SMK Penanti</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /><span>Data Terurus</span></div>
              <div className="w-1 h-1 rounded-full bg-muted" />
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Kemas kini: <LastUpdatedTime /></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchClasses} disabled={loading} className="border-border hover:bg-accent shadow-xs">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Kelas
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Tambah Kelas Baharu</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Isi maklumat kelas dan pilih tingkatan yang betul.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddClass} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Nama Kelas</Label>
                    <Input name="class_name" placeholder="Contoh: Ibnu Sina" className="border-border focus:border-primary" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Tingkatan</Label>
                    <Select name="grade" required>
                      <SelectTrigger><SelectValue placeholder="Pilih Tingkatan" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(g => <SelectItem key={g} value={g.toString()}>Tingkatan {g}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

        {/* STATS CARDS */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
  {[
    { label: "Tingkatan 1", count: gradeStats.T1, color: "text-foreground", iconColor: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "Tingkatan 2", count: gradeStats.T2, color: "text-chart-2", iconColor: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/20" },
    { label: "Tingkatan 3", count: gradeStats.T3, color: "text-chart-3", iconColor: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/20" },
    { label: "Tingkatan 4", count: gradeStats.T4, color: "text-orange-600", iconColor: "text-orange-600", bg: "bg-orange-100", border: "border-orange-200" },
    { label: "Tingkatan 5", count: gradeStats.T5, color: "text-purple-600", iconColor: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200" },
  ].map((item, i) => (
    <Card key={i} className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{item.label}</p>
            <h3 className={`text-3xl font-bold ${item.color}`}>
              {item.count}
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${item.bg} border ${item.border}`}>
            <Users className={`w-5 h-5 ${item.iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

        {/* MAIN TABLE CARD - EXACT MATCH TO SUBJECTS UI */}
        <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" /> Senarai Kelas
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Urus senarai mengikut tingkatan yang dipilih</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                {filteredTableData.length} rekod dalam {selectedTingkatan}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama kelas..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20" 
                />
              </div>
              
              <Select value={selectedTingkatan} onValueChange={setSelectedTingkatan}>
                <SelectTrigger className="h-11 rounded-lg border-border bg-background lg:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Tingkatan 1", "Tingkatan 2", "Tingkatan 3", "Tingkatan 4", "Tingkatan 5"].map(t => (
                    <SelectItem key={t} value={t} className="font-medium">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setSortBy("name"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}
                          className="p-0 h-auto font-semibold hover:bg-transparent"
                        >
                          Nama Kelas
                          {sortBy === "name" && (sortOrder === "asc" ? <SortAsc className="w-3.5 h-3.5 ml-1 text-primary" /> : <SortDesc className="w-3.5 h-3.5 ml-1 text-primary" />)}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Bil. Pelajar</TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Guru Kelas</TableHead> 
                      <TableHead className="font-semibold text-foreground py-4 text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary inline" /></TableCell></TableRow>
                    ) : filteredTableData.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-16 text-center text-muted-foreground">Tiada kelas dijumpai bagi {selectedTingkatan}</TableCell></TableRow>
                    ) : (
                      filteredTableData.map((cls, index) => (
                        <TableRow key={cls.id} className="hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                          <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-bold text-foreground">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary/60" />
                                {cls.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm w-4">{cls.studentCount}</span>
                              <Progress value={Math.min(100, (cls.studentCount || 0) * 2.5)} className="h-1.5 w-24 bg-muted" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className={`w-4 h-4 ${cls.teacherName === "Belum Dilantik" ? "text-muted-foreground" : "text-green-500"}`} />
                              <span className={`text-sm font-medium ${cls.teacherName === "Belum Dilantik" ? "text-muted-foreground italic" : "text-foreground"}`}>
                                {cls.teacherName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openDetails(cls)} title="Details" className="h-8 w-8 p-0 border-border hover:bg-accent hover:text-primary">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditing(cls)} className="h-8 w-8 p-0 border-border hover:bg-accent hover:text-primary">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleting(cls)} className="h-8 w-8 p-0">
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

        {/* DIALOG LANTIK GURU - MATCHING SUBJECTS COORDINATOR UI */}
        <Dialog open={!!detailsClass} onOpenChange={() => setDetailsClass(null)}>
          <DialogContent className="rounded-xl max-w-lg border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" /> Maklumat Kelas
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Lantik guru kelas untuk kelas ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <p className="text-xs text-muted-foreground">Nama Kelas</p>
                <p className="font-bold text-foreground">{detailsClass?.name} (Tingkatan {detailsClass?.grade})</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Guru Kelas</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder={loadingTeachers ? "Memuatkan guru..." : "Pilih guru kelas..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {classTeachers.length === 0 ? (
                      <SelectItem value="none" disabled>Tiada guru kelas dijumpai</SelectItem>
                    ) : (
                      classTeachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Hanya guru dengan peranan <b>guru kelas</b> dipaparkan.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDetailsClass(null)} className="border-border">Tutup</Button>
              <Button onClick={handleAppointClassTeacher} disabled={loading || !selectedTeacherId} className="gap-2 bg-primary">
                <UserCheck className="w-4 h-4" />
                Lantik Guru
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDIT */}
        <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
          <DialogContent className="rounded-lg border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Kemas Kini Kelas</DialogTitle>
              <DialogDescription>Ubah nama kelas yang dipilih.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditClass} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-medium">Nama Kelas</Label>
                <Input name="class_name" defaultValue={editing?.name} className="border-border focus:border-primary" required />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
                <Button type="submit" disabled={loading}>Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG DELETE */}
        <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
          <DialogContent className="rounded-lg border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Padam Kelas
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Anda pasti ingin memadam kelas <b className="text-foreground">{deleting?.name}</b>? Tindakan ini tidak boleh diundur.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
              <Button variant="destructive" onClick={handleDeleteClass} disabled={loading}>
                Ya, Padam Kelas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}