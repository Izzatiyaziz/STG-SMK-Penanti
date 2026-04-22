"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Users,
  GraduationCap,
  Plus,
  Loader2,
  Trash2,
  Search,
  Activity,
  ShieldCheck,
  Clock,
  Printer,
  UserCheck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

/* ================= TYPES ================= */
interface Student {
  id: string;
  name: string;
  identifier: string; // No Kad Pengenalan
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
}

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

export default function MyClassPage() {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch data kelas guru dan pelajar sedia ada
  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/class-teacher"); // Gunakan endpoint yang anda buat
      const data = await res.json();
      if (res.ok) {
        setClassInfo(data.class);
        setMyStudents(data.students);
      } else {
        toast.error(data.error || "Gagal memuatkan data");
      }
    } catch (error) {
      toast.error("Ralat sistem semasa memuatkan data");
    } finally {
      setLoading(false);
    }
  }

  // 2. Fetch pelajar yang tingkatan sama yang belum ada kelas
  async function fetchAvailableStudents() {
    if (!classInfo) return;
    try {
      const res = await fetch(`/api/teacher/available-students?grade=${classInfo.grade}`);
      const data = await res.json();
      setAvailableStudents(data);
    } catch (error) {
      toast.error("Gagal memuatkan senarai pelajar tersedia");
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 3. Tambah pelajar ke kelas
  async function handleAddStudent(studentId: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/teacher/my-class/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, classId: classInfo?.id }),
      });
      if (res.ok) {
        toast.success("Pelajar berjaya ditambah ke kelas ✅");
        fetchData(); 
        fetchAvailableStudents(); // Refresh modal list
      }
    } catch (error) {
      toast.error("Ralat semasa menambah pelajar");
    } finally {
      setActionLoading(false);
    }
  }

  // 4. Buang pelajar dari kelas
  async function handleRemoveStudent(studentId: string) {
    if (!confirm("Adakah anda pasti mahu mengeluarkan pelajar ini dari kelas?")) return;
    try {
      const res = await fetch(`/api/teacher/my-class/remove?studentId=${studentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pelajar telah dikeluarkan 🗑️");
        fetchData();
      }
    } catch (error) {
      toast.error("Gagal mengeluarkan pelajar");
    }
  }

  const filteredAvailable = availableStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Memuatkan maklumat kelas...</p>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-dashed border-2">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Akses Terhad</h2>
            <p className="text-muted-foreground text-sm">
              Anda belum ditetapkan sebagai Guru Kelas oleh pihak pentadbir. Sila hubungi Admin untuk maklumat lanjut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Pengurusan Pelajar Kelas</h1>
                <p className="text-muted-foreground font-medium mt-1">
                  Guru Kelas: <span className="text-primary font-bold">{classInfo.name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /><span>Tingkatan {classInfo.grade}</span></div>
              <div className="w-1 h-1 rounded-full bg-muted" />
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Kemas kini: <LastUpdatedTime /></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="hidden md:flex gap-2" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Cetak
              </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button onClick={fetchAvailableStudents} className="bg-primary hover:bg-primary/90 shadow-sm gap-2">
                  <Plus className="w-4 h-4" /> Tambah Pelajar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Tambah Pelajar Baru</DialogTitle>
                  <DialogDescription>
                    Menampilkan senarai pelajar Tingkatan {classInfo.grade} yang masih belum mempunyai kelas.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="relative my-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari nama atau IC..." 
                    className="pl-9 h-11"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-[350px] overflow-y-auto border rounded-xl shadow-inner bg-muted/5">
                  {filteredAvailable.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">Tiada pelajar tersedia dijumpai.</div>
                  ) : (
                    <Table>
                      <TableBody>
                        {filteredAvailable.map((student) => (
                          <TableRow key={student.id} className="hover:bg-background transition-colors">
                            <TableCell className="py-4">
                              <p className="font-bold text-sm text-foreground">{student.name}</p>
                              <p className="text-[11px] font-mono text-muted-foreground">{student.identifier}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                onClick={() => handleAddStudent(student.id)}
                                disabled={actionLoading}
                                className="h-8 rounded-lg"
                              >
                                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Tambah"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ================= STAT CARDS (GAYA STUDENT PAGE) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Nama Kelas</p>
                  <h3 className="text-2xl font-black text-foreground">{classInfo.name}</h3>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Kapasiti Pelajar</p>
                  <h3 className="text-2xl font-black text-emerald-600">{myStudents.length} / 40</h3>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-500/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Tingkatan</p>
                  <h3 className="text-2xl font-black text-amber-600">T{classInfo.grade}</h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= STUDENT TABLE (GAYA KOTAK INPUT) ================= */}
        <Card className="border-border bg-card shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
            <div className="flex justify-between items-center">
               <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Senarai Ahli Kelas
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Menguruskan maklumat dan kehadiran pelajar kelas anda</p>
               </div>
               <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                 AKTIF
               </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-16 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold">Nama Pelajar</TableHead>
                    <TableHead className="font-bold">No. Kad Pengenalan</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="text-right pr-6 font-bold">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Users className="w-12 h-12 opacity-20" />
                          <p className="font-medium italic">Kelas ini masih kosong. Klik butang Tambah Pelajar.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    myStudents.map((student, index) => (
                      <TableRow key={student.id} className="hover:bg-muted/50 border-b border-border/50 last:border-0 h-16 transition-colors">
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        {/* NAMA DENGAN AVATAR BULAT */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shadow-sm">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-foreground text-sm tracking-tight">{student.name}</span>
                          </div>
                        </TableCell>

                        {/* GAYA KOTAK INPUT (NO IC) */}
                        <TableCell>
                          <div className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground w-fit min-w-[140px] shadow-sm tabular-nums">
                            {student.identifier}
                          </div>
                        </TableCell>

                        {/* BADGE STATUS */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] tracking-widest">
                            HADIR
                          </Badge>
                        </TableCell>

                        {/* TINDAKAN BUANG */}
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 h-9 w-9 p-0 rounded-lg"
                            onClick={() => handleRemoveStudent(student.id)}
                            title="Keluarkan dari kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}