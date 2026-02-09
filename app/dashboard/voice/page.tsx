"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Phone, Clock, DollarSign, TrendingUp, Calendar as CalendarIcon, Timer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { format, parseISO, startOfDay, getHours } from "date-fns";

export default function VoiceDashboardPage() {
    const [stats, setStats] = useState({
        totalCalls: 0,
        totalDuration: 0,
        avgDuration: 0,
        totalCost: 0,
        avgCost: 0,
        successRate: 0,
        completedCalls: 0
    });
    const [dailyVolume, setDailyVolume] = useState<any[]>([]);
    const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/calls');
                if (!res.ok) throw new Error("Failed to fetch calls");
                const calls = await res.json();

                let totalDuration = 0;
                let totalCost = 0;
                let completed = 0;
                let successCount = 0;

                const dayMap = new Map();
                const hourMap = new Array(24).fill(0);

                calls.forEach((call: any) => {
                    // Metrics
                    if (call.status === 'ended' || call.status === 'completed') {
                        completed++;
                        // Assume success if no error reported or status is completed with normal end reason
                        if (call.endedReason !== 'error') successCount++;
                    }

                    const duration = call.durationSeconds || (call.duration || 0); // Vapi might calculate duration
                    const cost = call.cost || 0;

                    totalDuration += duration;
                    totalCost += cost;

                    // Charts processing
                    if (call.startedAt) {
                        const date = parseISO(call.startedAt);
                        const dayKey = format(date, 'MMM dd');
                        const hour = getHours(date);

                        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
                        hourMap[hour]++;
                    }
                });

                const totalCalls = calls.length;
                const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
                const avgCost = totalCalls > 0 ? totalCost / totalCalls : 0;
                const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 0;

                setStats({
                    totalCalls,
                    totalDuration,
                    avgDuration,
                    totalCost,
                    avgCost,
                    successRate,
                    completedCalls: completed
                });

                // Format Daily Volume
                const dailyData = Array.from(dayMap.entries()).map(([name, calls]) => ({ name, calls }));
                // Sort by date roughly (if needed, simplified here)
                setDailyVolume(dailyData.reverse().slice(0, 7).reverse()); // Show last 7 days

                // Format Hourly Distribution
                const hourlyData = hourMap.map((calls, hour) => ({
                    name: `${hour.toString().padStart(2, '0')}:00`,
                    calls
                })).filter((_, i) => i % 3 === 0); // Sample every 3 hours for cleaner chart

                setHourlyDistribution(hourlyData);

            } catch (error) {
                console.error("Error fetching voice data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Voice Agent Dashboard</h1>
                    <p className="text-slate-500">Monitor your AI voice agent performance.</p>
                </div>
                <div className="flex items-center gap-4">
                    <DateRangePicker onUpdate={(range) => console.log("Voice Dashboard Date Update:", range)} />
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Executions"
                    value={`${stats.totalCalls} calls`}
                    badge={`${stats.completedCalls} completed`}
                    icon={<Phone className="h-5 w-5 text-slate-600" />}
                />
                <MetricCard
                    title="Total Duration"
                    value={formatDuration(stats.totalDuration)}
                    icon={<Clock className="h-5 w-5 text-slate-600" />}
                />
                <MetricCard
                    title="Average Duration"
                    value={`${Math.round(stats.avgDuration)}s`}
                    icon={<Timer className="h-5 w-5 text-slate-600" />}
                />
                <MetricCard
                    title="Total Cost"
                    value={`$${stats.totalCost.toFixed(2)}`}
                    icon={<DollarSign className="h-5 w-5 text-slate-600" />}
                />
                <MetricCard
                    title="Average Cost"
                    value={`$${stats.avgCost.toFixed(2)}`}
                    icon={<DollarSign className="h-5 w-5 text-slate-600" />}
                />
                <MetricCard
                    title="Success Rate"
                    value={`${Math.round(stats.successRate)}%`}
                    icon={<TrendingUp className="h-5 w-5 text-slate-600" />}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6">Daily Call Volume</h3>
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyVolume.length > 0 ? dailyVolume : [{ name: 'No Data', calls: 0 }]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="calls" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6">Hourly Call Distribution</h3>
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hourlyDistribution.length > 0 ? hourlyDistribution : [{ name: '00:00', calls: 0 }]}>
                                    <defs>
                                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Area type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, badge, icon }: any) {
    return (
        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm relative group hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                        {badge && (
                            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                                {badge}
                            </div>
                        )}
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
