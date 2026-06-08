"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TrendingUp, Users, MessageSquare, Send, RefreshCw, Building2, Info } from "lucide-react";
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { LMLoader } from "@/components/lm-loader";
import { useData } from "@/context/DataContext";
import { format } from "date-fns";

export default function WhatsappAnalyticsPage() {
    const {
        whatsappMetrics,
        loadingWhatsappMetrics,
        refreshWhatsappMetrics,
    } = useData();

    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: subDays(new Date(), 7),
        to: new Date()
    });

    useEffect(() => {
        if (!dateRange?.from) return;
        refreshWhatsappMetrics({
            from: dateRange.from,
            to: dateRange.to || dateRange.from,
        });
    }, [dateRange, refreshWhatsappMetrics]);

    const loading = loadingWhatsappMetrics;
    const m = whatsappMetrics;

    const trendData = useMemo(() => {
        if (!m?.dailyTrend?.length) return [];
        return m.dailyTrend.map(d => ({
            date: format(new Date(d.date + 'T00:00:00'), 'MMM dd'),
            sent: d.reachouts,
            replied: d.replies,
        }));
    }, [m]);

    const replyRate = m?.replyRate ?? 0;

    return (
        <div className="space-y-4 pb-4 relative min-h-[500px]">
            {loading && <LMLoader />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Analytics</h1>
                    <p className="text-slate-500 text-sm">Track campaign performance and lead engagement</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker onUpdate={({ range }) => setDateRange({ from: range?.from, to: range?.to })} />
                    <Button variant="outline" size="sm" onClick={() => refreshWhatsappMetrics({ from: dateRange.from, to: dateRange.to, force: true })} className="h-10">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    title="Total Reachouts"
                    value={loading ? "..." : (m?.totalReachouts ?? 0).toLocaleString()}
                    icon={Send}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Total Replies"
                    value={loading ? "..." : (m?.totalReplies ?? 0).toLocaleString()}
                    icon={MessageSquare}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    info="This count is derived from the 'WP_Replied_track' column. Disclaimer: This feature has been installed now. To check original reply counts, please select the 'Last 3 Months' filter."
                />
                <StatCard
                    title="Response Rate"
                    value={loading ? "..." : `${replyRate.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                <StatCard
                    title="Unique Reachouts"
                    value={loading ? "..." : (m?.totalReachouts ?? 0).toLocaleString()}
                    icon={Users}
                    color="text-slate-600"
                    bg="bg-slate-50"
                />
            </div>

            {/* Owner Analytics */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-500" /> Owner Analytics
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <StatCard
                        title="Owner Reachouts"
                        value={loading ? "..." : (m?.ownerReachouts ?? 0).toLocaleString()}
                        icon={Building2}
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                    <StatCard
                        title="Owner Replies"
                        value={loading ? "..." : (m?.ownerReplies ?? 0).toLocaleString()}
                        icon={MessageSquare}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-900">Engagement Trend</CardTitle>
                        <CardDescription className="text-xs">Outbound reachouts vs incoming replies</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSent)" />
                                    <Area type="monotone" dataKey="replied" stroke="#10b981" strokeWidth={2} fill="url(#colorReplied)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-900">Loop Breakdown</CardTitle>
                        <CardDescription className="text-xs">Replies distribution by campaign</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                        <div className="h-[240px] w-full flex items-center justify-center text-slate-400 text-sm">
                            No loop data available
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg, info }: any) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden relative">
            {info && (
                <div className="absolute top-2 right-2">
                    <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger asChild>
                                <div className="p-1 cursor-help hover:scale-110 transition-transform">
                                    <Info className="h-6 w-6 text-red-500 fill-red-50" strokeWidth={2.5} />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] p-3 text-xs bg-slate-900 text-white border-none shadow-2xl rounded-xl">
                                <p className="font-bold mb-1">Important Note</p>
                                <p className="opacity-90 leading-relaxed">{info}</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                </div>
            )}
            <CardContent className="p-3.5 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-lg font-bold text-slate-900">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );
}
