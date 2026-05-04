"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileCheck2, FileText, FileSignature, Database, Folder } from "lucide-react";

export default function AdminUsersPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Pengurusan Pengguna
                        </h1>
                        <p className="text-muted-foreground">
                            Urus Guru dan Pelajar dalam satu tempat.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="shadow-lg border border-border/50">
                        <CardHeader>
                            <CardTitle>Guru</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                                Tambah, edit, dan tetapkan peranan guru.
                            </div>
                            <Button asChild>
                                <Link href="/admin/teacher">Buka Pengurusan Guru</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border border-border/50">
                        <CardHeader>
                            <CardTitle>Pelajar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                                Tambah, edit, dan tetapkan kelas pelajar.
                            </div>
                            <Button asChild>
                                <Link href="/admin/student">Buka Pengurusan Pelajar</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href="/admin/assignments">
                                <FileSignature className="w-4 h-4 mr-2" />
                                Assign Guru
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/exams">
                                <FileCheck2 className="w-4 h-4 mr-2" />
                                Peperiksaan
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/reports">
                                <FileText className="w-4 h-4 mr-2" />
                                Laporan
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/classes">
                                <Database className="w-4 h-4 mr-2" />
                                Kelas
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/subjects">
                                <Folder className="w-4 h-4 mr-2" />
                                Subjek
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
