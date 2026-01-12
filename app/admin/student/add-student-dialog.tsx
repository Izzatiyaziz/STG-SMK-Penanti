"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2,
    UserPlus,
    User,
    IdCard,
    Building2,
    Lock,
    GraduationCap,
    Calendar,
} from "lucide-react";

interface AddStudentDialogProps {
    onSuccess: () => void;
    classes: Array<{ id: string; name: string }>;
    children?: ReactNode;
}

export function AddStudentDialog({
    onSuccess,
    classes,
    children,
}: AddStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string>("none");
    const [formData, setFormData] = useState({
        fullname: "",
        ic_number: "",
        password: "",
        dob: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const payload = {
            fullname: formData.fullname,
            ic_number: formData.ic_number,
            password: formData.password,
            dob: formData.dob || null,
            class_id: selectedClass === "none" ? null : selectedClass,
        };

        try {
            const res = await fetch("/api/admin/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah pelajar");
                return;
            }

            toast.success("🎉 Pelajar berjaya ditambah!");
            setOpen(false);

            // Reset form
            setFormData({
                fullname: "",
                ic_number: "",
                password: "",
                dob: "",
            });
            setSelectedClass("none");

            onSuccess();
        } catch {
            toast.error("⚠️ Ralat rangkaian. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? (
                    children
                ) : (
                    <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Tambah Pelajar
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[480px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                            Daftar Pelajar Baru
                        </DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Isi maklumat pelajar untuk pendaftaran sistem
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* PERSONAL INFORMATION SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-foreground">
                                Maklumat Peribadi
                            </h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="fullname"
                                    className="text-sm font-medium flex items-center gap-1"
                                >
                                    <User className="w-3 h-3" />
                                    Nama Penuh *
                                </Label>
                                <Input
                                    id="fullname"
                                    name="fullname"
                                    value={formData.fullname}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: Ali bin Ahmad"
                                    required
                                    className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="ic_number"
                                        className="text-sm font-medium flex items-center gap-1"
                                    >
                                        <IdCard className="w-3 h-3" />
                                        No. Kad Pengenalan *
                                    </Label>
                                    <Input
                                        id="ic_number"
                                        name="ic_number"
                                        value={formData.ic_number}
                                        onChange={handleInputChange}
                                        placeholder="010101-01-0101"
                                        required
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="dob"
                                        className="text-sm font-medium flex items-center gap-1"
                                    >
                                        <Calendar className="w-3 h-3" />
                                        Tarikh Lahir
                                    </Label>
                                    <Input
                                        id="dob"
                                        name="dob"
                                        type="date"
                                        value={formData.dob}
                                        onChange={handleInputChange}
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CLASS ASSIGNMENT SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-secondary" />
                            <h3 className="font-semibold text-foreground">
                                Penempatan Kelas
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="class_id"
                                className="text-sm font-medium"
                            >
                                Pilih Kelas
                            </Label>
                            <Select
                                value={selectedClass}
                                onValueChange={setSelectedClass}
                            >
                                <SelectTrigger className="w-full rounded-xl border-2 border-border/30 focus:border-primary/50 h-11">
                                    <SelectValue placeholder="Pilih kelas pelajar..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-border">
                                    <SelectItem
                                        value="none"
                                        className="rounded-lg"
                                    >
                                        <div className="py-1">
                                            <div className="font-medium">
                                                Belum Ditetapkan
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Boleh ditetapkan kemudian
                                            </div>
                                        </div>
                                    </SelectItem>
                                    {classes.map((cls) => (
                                        <SelectItem
                                            key={cls.id}
                                            value={cls.id}
                                            className="rounded-lg"
                                        >
                                            <div className="py-1">
                                                <div className="font-medium">
                                                    {cls.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Kelas {cls.name}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedClass !== "none" &&
                                classes.find((c) => c.id === selectedClass) && (
                                    <div className="mt-2 p-2 rounded-lg bg-secondary/10 border border-secondary/20">
                                        <p className="text-xs text-secondary">
                                            📍 Kelas terpilih:{" "}
                                            <span className="font-semibold">
                                                {
                                                    classes.find(
                                                        (c) =>
                                                            c.id ===
                                                            selectedClass
                                                    )?.name
                                                }
                                            </span>
                                        </p>
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOpen(false);
                                setFormData({
                                    fullname: "",
                                    ic_number: "",
                                    password: "",
                                    dob: "",
                                });
                                setSelectedClass("none");
                            }}
                            className="flex-1 rounded-xl border-2 border-border/30 h-11 hover:bg-muted/50"
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg font-medium"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mendaftarkan...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Daftar Pelajar
                                </>
                            )}
                        </Button>
                    </div>

                    {/* FOOTER NOTES */}
                    <div className="pt-4 border-t border-border/20">
                        <div className="space-y-2">
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                <div className="w-2 h-2 rounded-full bg-primary/50 mt-1"></div>
                                <p>
                                    ID pelajar akan dijana automatik oleh sistem
                                </p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                <div className="w-2 h-2 rounded-full bg-primary/50 mt-1"></div>
                                <p>
                                    Semua maklumat disimpan dengan selamat dan
                                    boleh dikemas kini
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
