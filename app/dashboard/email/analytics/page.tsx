"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    Bell,
    RefreshCw,
    Database,
    Send,
    CheckCircle2,
    Eye,
    MousePointerClick,
    CornerUpLeft,
    AlertTriangle,
    TrendingUp,
    MailCheck
} from "lucide-react";
import React, { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

// Empty data for initial state as requested
const emptyData = [
    { name: 'Metric 1', value: 0 },
    { name: 'Metric 2', value: 0 },
    { name: 'Metric 3', value: 0 },
    { name: 'Metric 4', value: 0 },
];

export default function EmailAnalyticsPage() {
    const [activeRange, setActiveRange] = useState("24h");

    return (
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
                    <p className="text-slate-500">Detailed insights into your campaign performance</p>
                </div>

            </div>

            {/* Section Header & Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </Button><DateRangePicker />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Row 1 */}
                <MetricCard
                    label="Total Sent"
                    value="0"
                    icon={Send}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    label="Total Delivered"
                    value="0"
                    icon={CheckCircle2}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
                <MetricCard
                    label="Total Opens"
                    value="0"
                    icon={Eye}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <MetricCard
                    label="Total Clicks"
                    value="0"
                    icon={MousePointerClick}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />

                {/* Row 2 */}
                <MetricCard
                    label="Total Bounces"
                    value="0"
                    icon={CornerUpLeft}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                />
                <MetricCard
                    label="Total Complaints"
                    value="0"
                    icon={AlertTriangle}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-600"
                />
                <MetricCard
                    label="CTR"
                    value="0.00%"
                    icon={TrendingUp}
                    iconBg="bg-cyan-50"
                    iconColor="text-cyan-600"
                />
                <MetricCard
                    label="Delivery Rate"
                    value="0.00%"
                    icon={MailCheck}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Delivery Breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={emptyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 4]} />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Engagement">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={emptyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 4]} />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Performance Rates">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={emptyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 4]} />
                            <Legend />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}



function MetricCard({ label, value, icon: Icon, color, iconBg, iconColor }: any) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{label}</p>
                </div>
                <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </CardContent>
        </Card>
    );
}

function ChartCard({ title, children }: any) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                    {children}
                </div>
            </CardContent>
        </Card>
    );
}
