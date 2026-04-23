"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Range = "3m" | "30d" | "7d";
type Point = { date: string; value: number };

export default function SystemUsageChart() {
  const [range, setRange] = useState<Range>("30d");
  const [chartData, setChartData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/system-usage?range=${range}`);
        const json = await res.json();
        if (!cancelled) setChartData(json?.data ?? []);
      } catch {
        if (!cancelled) setChartData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <Card className="border border-border/50 shadow-lg">
      <CardContent className="p-6 space-y-4">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Penggunaan Sistem</h2>
            <p className="text-sm text-muted-foreground">
              Jumlah log masuk pengguna berdasarkan tempoh masa
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={range === "3m" ? "default" : "outline"}
              onClick={() => setRange("3m")}
            >
              Last 3 months
            </Button>
            <Button
              size="sm"
              variant={range === "30d" ? "default" : "outline"}
              onClick={() => setRange("30d")}
            >
              Last 30 days
            </Button>
            <Button
              size="sm"
              variant={range === "7d" ? "default" : "outline"}
              onClick={() => setRange("7d")}
            >
              Last 7 days
            </Button>
          </div>
        </div>

        {/* CHART */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                fill="url(#usageGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading...</div>
        )}

      </CardContent>
    </Card>
  );
}
