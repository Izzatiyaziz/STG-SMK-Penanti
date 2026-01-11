"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const data = [
    { exam: "UPSA 2024", percent: 52 },
    { exam: "UASA 2024", percent: 60 },
    { exam: "UPSA 2025", percent: 70 },
];

export default function PerformanceTrendChart() {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    {/* GRID – penting untuk visual */}
                    <CartesianGrid strokeDasharray="3 3" />

                    {/* AXIS */}
                    <XAxis dataKey="exam" />
                    <YAxis domain={[0, 100]} />

                    {/* TOOLTIP */}
                    <Tooltip />

                    {/* LINE – INI YANG SAMBUNG TITIK */}
                    <Line
                        type="monotone"
                        dataKey="percent"
                        stroke="#2563eb"   // biru jelas
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
