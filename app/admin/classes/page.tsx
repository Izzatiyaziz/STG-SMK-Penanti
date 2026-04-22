"use client";

<<<<<<< HEAD
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
=======
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    RefreshCw,
    Loader2,
    Building2,
    Filter,
    SortAsc,
    SortDesc,
    Shield,
    Clock,
    Plus,
    Backpack,
    Users,
    ChevronRight,
    X,
    AlertCircle,
    CheckCircle2,
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
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
<<<<<<< HEAD
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
=======
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClassItem } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ✅ Client-side only time component */
const LastUpdatedTime = () => {
<<<<<<< HEAD
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
=======
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        const update = () =>
            setTime(
                new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );

        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="font-medium text-primary/90">
            {time || "Loading..."}
        </span>
    );
};

type ClassWithCount = ClassItem & { studentCount?: number };

export default function ClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassWithCount[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "studentCount">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedGrade, setSelectedGrade] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<string>("all");

    // ================= FETCH CLASSES =================
    async function fetchClasses() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/classes");
            const classData: ClassItem[] = await res.json();

            const studentRes = await fetch("/api/admin/users?role=student");
            const allStudents = await studentRes.json();

            const updated: ClassWithCount[] = classData
                .filter((cls) => cls.grade === selectedGrade)
                .map((cls) => {
                    const studentCount = (allStudents || []).filter(
                        (s: any) => s.class_id === cls.id
                    ).length;
                    return {
                        ...cls,
                        studentCount,
                    };
                });

            setClasses(updated);
        } catch (err) {
            console.error("FETCH CLASSES ERROR:", err);
            toast.error("Gagal memuatkan senarai kelas", {
                description: "Sila cuba sebentar lagi",
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchClasses();
    }, [selectedGrade]);

    // ================= FILTER + SORT =================
    const filteredClasses = useMemo(() => {
        let filtered = classes.filter((cls) =>
            cls.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Filter by active tab
        if (activeTab === "withStudents") {
            filtered = filtered.filter((cls) => (cls.studentCount || 0) > 0);
        } else if (activeTab === "empty") {
            filtered = filtered.filter((cls) => (cls.studentCount || 0) === 0);
        }

        return filtered.sort((a, b) => {
            let compareA: any;
            let compareB: any;

            if (sortBy === "name") {
                compareA = a.name.toLowerCase();
                compareB = b.name.toLowerCase();
            } else {
                compareA = a.studentCount || 0;
                compareB = b.studentCount || 0;
            }

            if (sortOrder === "asc") return compareA > compareB ? 1 : -1;
            return compareA < compareB ? 1 : -1;
        });
    }, [classes, searchQuery, sortBy, sortOrder, activeTab]);

    // ================= ADD CLASS =================
    async function handleAddClass(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsAdding(true);

        const formData = new FormData(e.currentTarget);
        const className = formData.get("class_name") as string;
        const trimmedName = className.trim();

        if (!trimmedName) {
            toast.error("Sila masukkan nama kelas");
            setIsAdding(false);
            return;
        }

        try {
            const res = await fetch("/api/admin/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_name: trimmedName,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah kelas");
                return;
            }

            toast.success("Kelas berjaya ditambah", {
                description: `${trimmedName} telah ditambah ke dalam sistem`,
                icon: <CheckCircle2 className="h-4 w-4" />,
            });
            fetchClasses();
            (
                document.getElementById("close-add-dialog") as HTMLButtonElement
            )?.click();
            (e.target as HTMLFormElement).reset();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setIsAdding(false);
        }
    }

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "studentCount") => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    // Calculate statistics
    const totalStudents = useMemo(
        () => classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0),
        [classes]
    );

    const emptyClasses = useMemo(
        () => classes.filter((cls) => (cls.studentCount || 0) === 0).length,
        [classes]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/5 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                <Backpack className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                    Pengurusan Kelas
                                </h1>
                                <p className="text-muted-foreground font-medium mt-0.5">
                                    Urus dan pantau semua kelas dalam sistem
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" />
                                <span>{classes.length} Kelas</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-muted" />
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                <span>{totalStudents} Pelajar</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-muted" />
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                    Kemas kini: <LastUpdatedTime />
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={fetchClasses}
                                        disabled={loading}
                                        className="h-10 w-10 border-border/50 hover:bg-muted/50 transition-all duration-200"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Refresh data</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* ADD CLASS */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 group">
                                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                                    Tambah Kelas
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="rounded-xl border-border/40 bg-card shadow-xl">
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <DialogTitle className="text-xl font-bold text-foreground">
                                                Tambah Kelas Baharu
                                            </DialogTitle>
                                            <DialogDescription className="text-muted-foreground mt-1">
                                                Masukkan nama kelas untuk
                                                menambah ke dalam sistem.
                                            </DialogDescription>
                                        </div>
                                        <DialogClose className="rounded-full p-1.5 hover:bg-muted transition-colors">
                                            <X className="h-4 w-4" />
                                        </DialogClose>
                                    </div>
                                </DialogHeader>

                                <form
                                    onSubmit={handleAddClass}
                                    className="space-y-5 pt-2"
                                >
                                    <div className="space-y-3">
                                        <Label
                                            htmlFor="class_name"
                                            className="font-medium text-sm"
                                        >
                                            Nama Kelas
                                        </Label>
                                        <Input
                                            id="class_name"
                                            name="class_name"
                                            placeholder="Contoh: Ibnu Sina"
                                            required
                                            autoFocus
                                            className="rounded-lg h-11 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Nama kelas akan ditambah ke
                                            Tingkatan {selectedGrade}
                                        </p>
                                    </div>

                                    <DialogFooter className="pt-4 border-t border-border/30">
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-lg h-10"
                                            >
                                                Batal
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={isAdding}
                                            className="rounded-lg h-10 bg-primary hover:bg-primary/90 min-w-24"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                "Simpan Kelas"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border/40 bg-gradient-to-br from-card to-card/95 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Jumlah Kelas
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {classes.length}
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-primary/10">
                                    <Building2 className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                            <Badge
                                variant="outline"
                                className="mt-3 border-primary/20 bg-primary/5"
                            >
                                Tingkatan {selectedGrade}
                            </Badge>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-gradient-to-br from-card to-card/95 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Jumlah Pelajar
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {totalStudents}
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-green-500/10">
                                    <Users className="w-5 h-5 text-green-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                Purata{" "}
                                {classes.length > 0
                                    ? Math.round(totalStudents / classes.length)
                                    : 0}{" "}
                                pelajar/kelas
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-gradient-to-br from-card to-card/95 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Kelas Kosong
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {emptyClasses}
                                    </p>
                                </div>
                                <div className="p-3 rounded-full bg-amber-500/10">
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                {classes.length > 0
                                    ? Math.round(
                                          (emptyClasses / classes.length) * 100
                                      )
                                    : 0}
                                % dari total
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* MAIN CARD */}
                <Card className="border-border/40 bg-gradient-to-br from-card to-card/95 rounded-2xl shadow-lg overflow-hidden">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-card/95 to-card/90 px-6 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-primary" />
                                    Senarai Kelas Tingkatan {selectedGrade}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Klik pada nama kelas untuk melihat butiran
                                    lanjut
                                </p>
                            </div>

                            <Badge
                                variant="outline"
                                className="border-primary/30 bg-primary/5 text-primary font-medium"
                            >
                                {filteredClasses.length} kelas ditemui
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* FILTERS */}
                        <div className="space-y-4 mb-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari kelas mengikut nama..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="pl-11 h-11 rounded-lg border-border/60 bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>

                                <Select
                                    value={String(selectedGrade)}
                                    onValueChange={(v) =>
                                        setSelectedGrade(Number(v))
                                    }
                                >
                                    <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background min-w-[180px]">
                                        <SelectValue placeholder="Pilih Tingkatan" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-border/60">
                                        {[1, 2, 3, 4, 5].map((grade) => (
                                            <SelectItem
                                                key={grade}
                                                value={String(grade)}
                                                className="focus:bg-primary/10"
                                            >
                                                Tingkatan {grade}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* TABS */}
                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                                className="w-full"
                            >
                                <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-muted/50 p-1">
                                    <TabsTrigger
                                        value="all"
                                        className="rounded-md data-[state=active]:bg-background"
                                    >
                                        Semua Kelas
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="withStudents"
                                        className="rounded-md data-[state=active]:bg-background"
                                    >
                                        Ada Pelajar
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="empty"
                                        className="rounded-md data-[state=active]:bg-background"
                                    >
                                        Kosong
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* TABLE */}
                        <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gradient-to-r from-muted/20 to-muted/10">
                                        <TableRow className="hover:bg-transparent border-b border-border/60">
                                            <TableHead className="w-14 text-center font-semibold text-muted-foreground">
                                                #
                                            </TableHead>

                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleSort("name")
                                                    }
                                                    className="px-3 h-9 font-semibold hover:bg-muted/50 transition-colors rounded-lg"
                                                >
                                                    Nama Kelas
                                                    {sortBy === "name" ? (
                                                        sortOrder === "asc" ? (
                                                            <SortAsc className="w-3.5 h-3.5 ml-2" />
                                                        ) : (
                                                            <SortDesc className="w-3.5 h-3.5 ml-2" />
                                                        )
                                                    ) : (
                                                        <SortAsc className="w-3.5 h-3.5 ml-2 opacity-30" />
                                                    )}
                                                </Button>
                                            </TableHead>

                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleSort(
                                                            "studentCount"
                                                        )
                                                    }
                                                    className="px-3 h-9 font-semibold hover:bg-muted/50 transition-colors rounded-lg"
                                                >
                                                    Bilangan Pelajar
                                                    {sortBy ===
                                                    "studentCount" ? (
                                                        sortOrder === "asc" ? (
                                                            <SortAsc className="w-3.5 h-3.5 ml-2" />
                                                        ) : (
                                                            <SortDesc className="w-3.5 h-3.5 ml-2" />
                                                        )
                                                    ) : (
                                                        <SortAsc className="w-3.5 h-3.5 ml-2 opacity-30" />
                                                    )}
                                                </Button>
                                            </TableHead>

                                            <TableHead className="w-24 text-center font-semibold text-muted-foreground">
                                                Tindakan
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="py-12 text-center"
                                                >
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="relative">
                                                            <div className="h-12 w-12 rounded-full border-2 border-primary/20"></div>
                                                            <Loader2 className="w-12 h-12 animate-spin text-primary absolute inset-0 m-auto" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-medium text-foreground">
                                                                Memuatkan
                                                                senarai kelas...
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Sila tunggu
                                                                sebentar
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredClasses.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="py-12 text-center"
                                                >
                                                    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                                        <div className="p-4 rounded-full bg-muted/30">
                                                            <Search className="w-8 h-8 text-muted-foreground" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-medium text-foreground">
                                                                Tiada kelas
                                                                dijumpai
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {searchQuery
                                                                    ? `Tiada hasil untuk "${searchQuery}" dalam tingkatan ${selectedGrade}`
                                                                    : activeTab ===
                                                                      "empty"
                                                                    ? "Tiada kelas kosong dalam tingkatan ini"
                                                                    : "Tiada kelas dalam tingkatan ini"}
                                                            </p>
                                                        </div>
                                                        {(searchQuery ||
                                                            activeTab !==
                                                                "all") && (
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSearchQuery(
                                                                        ""
                                                                    );
                                                                    setActiveTab(
                                                                        "all"
                                                                    );
                                                                }}
                                                                className="mt-2"
                                                            >
                                                                <X className="w-3.5 h-3.5 mr-2" />
                                                                Padam semua
                                                                penapis
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClasses.map(
                                                (cls, index) => (
                                                    <TableRow
                                                        key={cls.id}
                                                        className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/2 transition-all duration-200 border-border/40"
                                                    >
                                                        <TableCell className="text-center font-medium text-muted-foreground">
                                                            {index + 1}
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                                                    <Building2 className="w-4 h-4 text-primary" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <button
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/admin/classes/${cls.id}`
                                                                            )
                                                                        }
                                                                        className="font-semibold text-foreground hover:text-primary transition-colors text-left flex items-center gap-2 group/btn"
                                                                    >
                                                                        {
                                                                            cls.name
                                                                        }
                                                                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 translate-x-[-4px] group-hover/btn:translate-x-0 transition-all" />
                                                                    </button>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="mt-1 w-fit text-xs rounded-full border-primary/20 bg-primary/5"
                                                                    >
                                                                        Tingkatan{" "}
                                                                        {
                                                                            cls.grade
                                                                        }
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={`px-3 py-1.5 rounded-lg ${
                                                                        cls.studentCount &&
                                                                        cls.studentCount >
                                                                            0
                                                                            ? "bg-green-500/10 text-green-700"
                                                                            : "bg-amber-500/10 text-amber-700"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Users className="w-3.5 h-3.5" />
                                                                        <span className="font-semibold">
                                                                            {cls.studentCount ||
                                                                                0}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm text-muted-foreground">
                                                                    pelajar
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="flex justify-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/admin/classes/${cls.id}`
                                                                        )
                                                                    }
                                                                    className="h-8 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                                >
                                                                    Lihat
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* FOOTER INFO */}
                        {filteredClasses.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground">
                                <p>
                                    Menunjukkan{" "}
                                    <span className="font-medium text-foreground">
                                        {filteredClasses.length}
                                    </span>{" "}
                                    dari{" "}
                                    <span className="font-medium text-foreground">
                                        {classes.length}
                                    </span>{" "}
                                    kelas
                                </p>
                                <p className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Dikemaskini: <LastUpdatedTime />
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
