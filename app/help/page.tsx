"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Help</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <div>
                            Halaman bantuan belum disediakan. Beritahu saya bahagian
                            mana yang anda mahu dokumentasikan (login, pemarkahan,
                            approvals, report card, dll).
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
