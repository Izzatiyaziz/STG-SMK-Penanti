"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Backpack,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Building2,
  Filter,
  SortAsc,
  SortDesc,
  Shield,
  Clock,
  Eye,
  UserCheck,
  Save,
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

// ======================= TIME COMPONENT =======================
const LastUpdatedTime = () => {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-medium text-primary">{time || "Loading..."}</span>
  );
};

// ======================= DETECT TINGKATAN FROM IC =======================
const getTingkatanFromIC = (ic: string) => {
  const clean = (ic || "").replace(/[^0-9]/g, "");
  if (clean.length < 2) return "Tidak pasti";

  const yy = parseInt(clean.slice(0, 2), 10);
  if (Number.isNaN(yy)) return "Tidak pasti";

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  const birthYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const age = currentYear - birthYear;

  const tingkatan = age - 12;

  if (tingkatan >= 1 && tingkatan <= 5) return `Tingkatan ${tingkatan}`;
  return "Tidak pasti";
};

type ClassWithCount = ClassItem & { studentCount?: number };

type TeacherItem = {
  id: string;
  name: string;
  email?: string | null;
  roles?: string[];
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Details modal (Assign + Edit + Delete)
  const [detailsClass, setDetailsClass] = useState<ClassItem | null>(null);

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  // ✅ edit class name inside modal
  const [editingName, setEditingName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "studentCount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ✅ FILTER TINGKATAN
  const [selectedTingkatan, setSelectedTingkatan] =
    useState<string>("Tingkatan 5");

  // ================= FETCH CLASSES + STUDENT TALLY =================
  async function fetchClasses() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/classes");
      const classData: ClassItem[] = await res.json();

      const studentRes = await fetch("/api/admin/users?role=student");
      const allStudents = await studentRes.json();

      const updated = classData.map((cls) => {
        const count = (allStudents || []).filter((s: any) => {
          const sameClass = s.className === cls.name;

          const tingkatanStudent = getTingkatanFromIC(s.identifier);
          const sameTingkatan =
            selectedTingkatan === "Tingkatan 5" ||
            tingkatanStudent === selectedTingkatan;

          return sameClass && sameTingkatan;
        }).length;

        return { ...cls, studentCount: count };
      });

      setClasses(updated);
    } catch (err) {
      console.error("FETCH CLASSES ERROR:", err);
      toast.error("Gagal memuatkan senarai kelas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTingkatan]);

  // ================= FILTER + SORT =================
  const filteredClasses = useMemo(() => {
    return classes
      .filter((cls) =>
        cls.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
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
  }, [classes, searchQuery, sortBy, sortOrder]);

  // ================= ✅ FETCH ONLY CLASS TEACHERS =================
  async function fetchAllTeachers() {
    setLoadingTeachers(true);
    try {
      const res = await fetch("/api/admin/users?role=teacher");
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Gagal memuatkan senarai guru");
        return;
      }

      // ✅ keep only teachers with role "class teacher"
      const onlyClassTeachers: TeacherItem[] = (data || [])
        .filter(
          (t: any) => Array.isArray(t.roles) && t.roles.includes("class teacher")
        )
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email ?? null,
          roles: t.roles ?? [],
        }));

      setTeachers(onlyClassTeachers);
    } catch {
      toast.error("Gagal memuatkan senarai guru");
    } finally {
      setLoadingTeachers(false);
    }
  }

  // ================= OPEN DETAILS MODAL =================
  async function openDetails(cls: ClassItem) {
    setDetailsClass(cls);
    setEditingName(cls.name); // ✅ load name into edit input

    // ✅ load teachers list first
    await fetchAllTeachers();

    // ✅ fetch current assignment for this class
    try {
      const res = await fetch(`/api/admin/class-teacher?class_id=${cls.id}`);
      const data = await res.json();

      if (data?.teacher_id) {
        setSelectedTeacherId(data.teacher_id);
      } else {
        setSelectedTeacherId("");
      }
    } catch {
      setSelectedTeacherId("");
    }
  }

  // ================= ASSIGN CLASS TEACHER =================
  async function handleAssignClassTeacher() {
    if (!detailsClass) return;

    if (!selectedTeacherId) {
      toast.error("Sila pilih guru untuk kelas ini");
      return;
    }

    try {
      const res = await fetch("/api/admin/class-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: detailsClass.id,
          teacher_id: selectedTeacherId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Gagal lantik guru kelas");
        return;
      }

      toast.success("Guru kelas berjaya dilantik ✅");
    } catch {
      toast.error("Ralat sistem. Sila cuba lagi");
    }
  }

  // ================= ✅ EDIT CLASS NAME (IN MODAL) =================
  async function handleEditClassInModal() {
    if (!detailsClass) return;

    if (!editingName.trim()) {
      toast.error("Nama kelas tidak boleh kosong");
      return;
    }

    try {
      const res = await fetch("/api/admin/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: detailsClass.id,
          class_name: editingName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal mengemas kini kelas");
        return;
      }

      toast.success("Kelas berjaya dikemas kini ✅");

      // ✅ refresh list
      await fetchClasses();

      // ✅ update modal current class name
      setDetailsClass({
        ...detailsClass,
        name: editingName.trim(),
      });
    } catch {
      toast.error("Ralat sistem. Sila cuba lagi");
    }
  }

  // ================= ✅ DELETE CLASS (IN MODAL) =================
  async function handleDeleteClassInModal() {
    if (!detailsClass) return;

    try {
      const res = await fetch(`/api/admin/classes?id=${detailsClass.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal memadam kelas");
        return;
      }

      toast.success("Kelas berjaya dipadam ✅");
      setDetailsClass(null);
      fetchClasses();
    } catch {
      toast.error("Ralat sistem. Sila cuba lagi");
    }
  }

  // ================= ADD CLASS =================
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Gagal menambah kelas");
        return;
      }

      toast.success("Kelas berjaya ditambah ✅");
      fetchClasses();

      (document.getElementById("close-add-dialog") as HTMLButtonElement)?.click();
    } catch {
      toast.error("Ralat sistem. Sila cuba lagi.");
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <Backpack className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Pengurusan Kelas
                </h1>
                <p className="text-muted-foreground font-medium mt-1">
                  Klik nama kelas untuk lantik guru kelas / edit / delete.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Data Terurus</span>
              <div className="w-1 h-1 rounded-full bg-muted" />
              <Clock className="w-3.5 h-3.5" />
              <span>
                Kemas kini: <LastUpdatedTime />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchClasses}
              disabled={loading}
              className="border-border hover:bg-accent"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>

            {/* ADD CLASS */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Kelas
                </Button>
              </DialogTrigger>

              <DialogContent className="rounded-lg border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">
                    Tambah Kelas Baharu
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Masukkan nama kelas untuk menambah kelas baharu dalam sistem.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAddClass} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="class_name" className="font-medium">
                      Nama Kelas
                    </Label>
                    <Input
                      id="class_name"
                      name="class_name"
                      placeholder="Contoh: Ibnu Sina"
                      required
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button
                      id="close-add-dialog"
                      type="button"
                      variant="outline"
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* MAIN CARD */}
        <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  Senarai Kelas
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Paparan pelajar mengikut tingkatan yang dipilih.
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
            {/* SEARCH + FILTER */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-lg border-border bg-background"
                />
              </div>

              <Select
                value={selectedTingkatan}
                onValueChange={setSelectedTingkatan}
              >
                <SelectTrigger className="h-11 rounded-lg border-border bg-background w-full sm:w-[220px]">
                  <SelectValue placeholder="Pilih Tingkatan" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border">
                  <SelectItem value="Tingkatan 1">Tingkatan 1</SelectItem>
                  <SelectItem value="Tingkatan 2">Tingkatan 2</SelectItem>
                  <SelectItem value="Tingkatan 3">Tingkatan 3</SelectItem>
                  <SelectItem value="Tingkatan 4">Tingkatan 4</SelectItem>
                  <SelectItem value="Tingkatan 5">Tingkatan 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TABLE */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="w-16 text-center">#</TableHead>

                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("name")}
                          className="p-0 h-auto font-semibold hover:bg-transparent"
                        >
                          Nama Kelas
                          {sortBy === "name" &&
                            (sortOrder === "asc" ? (
                              <SortAsc className="w-3.5 h-3.5 ml-1" />
                            ) : (
                              <SortDesc className="w-3.5 h-3.5 ml-1" />
                            ))}
                        </Button>
                      </TableHead>

                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort("studentCount")}
                          className="p-0 h-auto font-semibold hover:bg-transparent"
                        >
                          Bilangan Pelajar
                          {sortBy === "studentCount" &&
                            (sortOrder === "asc" ? (
                              <SortAsc className="w-3.5 h-3.5 ml-1" />
                            ) : (
                              <SortDesc className="w-3.5 h-3.5 ml-1" />
                            ))}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-16 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary inline" />
                        </TableCell>
                      </TableRow>
                    ) : filteredClasses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-16 text-center">
                          Tiada kelas dijumpai
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClasses.map((cls, index) => (
                        <TableRow key={cls.id} className="hover:bg-muted/50">
                          <TableCell className="text-center">
                            {index + 1}
                          </TableCell>

                          <TableCell
                            className="font-semibold text-primary cursor-pointer hover:underline"
                            onClick={() => openDetails(cls)}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              {cls.name}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="text-foreground font-semibold">
                                {cls.studentCount || 0}
                              </div>
                              <div className="w-24">
                                <Progress
                                  value={(cls.studentCount || 0) * 3.33}
                                  className="h-1.5 bg-muted"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                pelajar
                              </span>
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

        {/* ✅ DETAILS MODAL (ASSIGN + EDIT + DELETE) */}
        <Dialog
          open={!!detailsClass}
          onOpenChange={(open) => {
            if (!open) setDetailsClass(null);
          }}
        >
          <DialogContent className="rounded-xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Maklumat Kelas
              </DialogTitle>
              <DialogDescription>
                Anda boleh lantik guru kelas, edit nama kelas atau padam kelas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* CLASS NAME (EDITABLE) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nama Kelas</Label>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleEditClassInModal}
                >
                  <Save className="w-4 h-4" />
                  Simpan Nama Kelas
                </Button>
              </div>

              {/* ASSIGN CLASS TEACHER */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Guru Kelas (Role: class teacher sahaja)
                </Label>

                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingTeachers ? "Memuatkan guru..." : "Pilih guru..."
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {loadingTeachers ? (
                      <SelectItem value="__loading__" disabled>
                        Memuatkan...
                      </SelectItem>
                    ) : teachers.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Tiada guru dengan role "class teacher"
                      </SelectItem>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  className="w-full gap-2"
                  onClick={handleAssignClassTeacher}
                >
                  <UserCheck className="w-4 h-4" />
                  Lantik Guru Kelas
                </Button>
              </div>

              {/* DELETE */}
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">
                  Padam Kelas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tindakan ini tidak boleh dibatalkan.
                </p>

                <Button
                  variant="destructive"
                  className="w-full mt-3 gap-2"
                  onClick={handleDeleteClassInModal}
                >
                  <Trash2 className="w-4 h-4" />
                  Padam Kelas Ini
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDetailsClass(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
