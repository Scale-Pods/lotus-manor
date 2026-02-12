"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw,
    Send,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    Activity
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

interface HistoryData {
    date: string;
    sent: number;
    inbox: number;
    spam: number;
}

interface WarmupData {
    email: string;
    total_sent: number;
    landed_inbox: number;
    landed_spam: number;
    received: number;
    health_score: number;
    health_label: string;
    inbox_rate: number;
    spam_rate: number;
    status: "Healthy" | "Medium" | "Poor";
    history?: HistoryData[];
}

export default function EmailAnalyticsPage() {
    const [warmupData, setWarmupData] = useState<WarmupData[]>([]);
    const [generalData, setGeneralData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });

    const fetchData = async (start?: Date, end?: Date) => {
        setLoading(true);
        setError(null);
        try {
            const startDate = start ? start.toISOString().split('T')[0] : '';
            const endDate = end ? end.toISOString().split('T')[0] : '';

            // Fetch Warmup Data
            const warmupRes = await fetch('/api/email/warmup-analytics', { method: 'POST' });
            let warmupJson = [];
            if (warmupRes.ok) {
                warmupJson = await warmupRes.json();
            } else {
                console.error("Warmup fetch failed");
            }

            // Fetch General Analytics Data
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);

            const generalRes = await fetch(`/api/email/analytics?${queryParams.toString()}`);
            let generalJson = null;
            if (generalRes.ok) {
                generalJson = await generalRes.json();
            } else {
                console.error("General analytics fetch failed");
            }

            setWarmupData(warmupJson);
            setGeneralData(generalJson);

        } catch (e: any) {
            console.error("Analytics fetch error", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(dateRange?.from, dateRange?.to);
    }, []);

    const handleDateUpdate = ({ range }: { range: DateRange | undefined }) => {
        setDateRange(range);
        if (range?.from && range?.to) {
            fetchData(range.from, range.to);
        }
    };

    // Calculate metrics locally if generalData is array of daily stats or aggregates
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let totalUnsubscribed = 0;
    let totalReplies = 0;

    if (generalData) {
        if (Array.isArray(generalData)) {
            generalData.forEach((day: any) => {
                totalSent += (Number(day.total_sent) || Number(day.sent) || 0);
                totalDelivered += (Number(day.total_delivered) || Number(day.delivered) || 0);
                totalOpens += (Number(day.total_opens) || Number(day.opens) || 0);
                totalClicks += (Number(day.total_clicks) || Number(day.clicks) || 0);
                totalUnsubscribed += (Number(day.total_unsubscribed) || Number(day.unsubscribed) || 0);
                totalReplies += (Number(day.replies) || 0);
            });
        } else {
            // Assuming single object
            totalSent = Number(generalData.total_sent) || 0;
            totalDelivered = Number(generalData.total_delivered) || 0;
            totalOpens = Number(generalData.total_opens) || 0;
            totalClicks = Number(generalData.total_clicks) || 0;
            totalUnsubscribed = Number(generalData.total_unsubscribed) || 0;
            totalReplies = Number(generalData.replies) || 0;
        }
    }

    const ctr = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(2) : "0.00";
    const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(2) : "0.00";
    const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(2) : "0.00";


    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Email Analytics</h1>
                    <p className="text-slate-500">Comprehensive campaign and warm-up performance</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker onUpdate={handleDateUpdate} />
                    <Button
                        onClick={() => fetchData(dateRange?.from, dateRange?.to)}
                        variant="outline"
                        size="icon"
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Campaign Performance Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Campaign Performance</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <MetricCard
                        label="Total Sent"
                        value={totalSent.toLocaleString()}
                        icon={Send}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                    />
                    <MetricCard
                        label="Delivered"
                        value={totalDelivered.toLocaleString()}
                        icon={CheckCircle2}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                    />
                    <MetricCard
                        label="Opens"
                        value={totalOpens.toLocaleString()}
                        subtext={`${openRate}% Rate`}
                        icon={TrendingUp}
                        iconBg="bg-purple-50"
                        iconColor="text-purple-600"
                    />
                    <MetricCard
                        label="Clicks"
                        value={totalClicks.toLocaleString()}
                        subtext={`${ctr}% CTR`}
                        icon={TrendingUp}
                        iconBg="bg-indigo-50"
                        iconColor="text-indigo-600"
                    />
                    <MetricCard
                        label="Replies"
                        value={totalReplies.toLocaleString()}
                        subtext={`${replyRate}% Rate`}
                        icon={TrendingUp}
                        iconBg="bg-cyan-50"
                        iconColor="text-cyan-600"
                    />
                    <MetricCard
                        label="Unsubscribed"
                        value={totalUnsubscribed.toLocaleString()}
                        icon={AlertTriangle}
                        iconBg="bg-orange-50"
                        iconColor="text-orange-600"
                    />
                </div>
            </div>

            {/* Warm-up Analytics Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Warm-up Health</h2>
                {!loading && warmupData.length === 0 && !error && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Warm-up Data</AlertTitle>
                        <AlertDescription>No warm-up data found for the configured emails.</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-8">
                    {warmupData.map((account) => (
                        <div key={account.email} className="space-y-4">
                            <Card className="overflow-hidden border-slate-200">
                                <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                            {account.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{account.email}</h3>
                                            <p className="text-xs text-slate-500">Warm-up Status</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={account.status} score={account.health_score} />
                                </div>

                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                                        <MiniMetric
                                            label="Health Score"
                                            value={`${account.health_score}/100`}
                                            subtext={account.health_label}
                                            icon={Activity}
                                            color="text-indigo-600"
                                            bg="bg-indigo-50"
                                        />
                                        <MiniMetric
                                            label="Inbox Rate"
                                            value={`${account.inbox_rate}%`}
                                            icon={CheckCircle2}
                                            color="text-emerald-600"
                                            bg="bg-emerald-50"
                                        />
                                        <MiniMetric
                                            label="Spam Rate"
                                            value={`${account.spam_rate}%`}
                                            icon={AlertTriangle}
                                            color="text-rose-600"
                                            bg="bg-rose-50"
                                        />
                                        <MiniMetric
                                            label="Total Sent"
                                            value={account.total_sent}
                                            icon={Send}
                                            color="text-blue-600"
                                            bg="bg-blue-50"
                                        />
                                        <MiniMetric
                                            label="Landed Inbox"
                                            value={account.landed_inbox}
                                            icon={ShieldCheck}
                                            color="text-emerald-600"
                                            bg="bg-emerald-50"
                                        />
                                        <MiniMetric
                                            label="Landed Spam"
                                            value={account.landed_spam}
                                            icon={AlertCircle}
                                            color="text-amber-600"
                                            bg="bg-amber-50"
                                        />
                                    </div>

                                    {/* Graph Section */}
                                    {account.history && account.history.length > 0 ? (
                                        <div className="h-[400px] w-full mt-4">
                                            <h4 className="text-sm font-semibold text-slate-500 mb-4">Daily Performance</h4>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={account.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id={`colorInbox-${account.email}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id={`colorSent-${account.email}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                                        tickFormatter={(str) => {
                                                            const date = new Date(str);
                                                            return `${date.getMonth() + 1}/${date.getDate()}`;
                                                        }}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                    />
                                                    <Legend iconType="circle" />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="sent"
                                                        name="Emails Sent"
                                                        stroke="#3b82f6"
                                                        fillOpacity={1}
                                                        fill={`url(#colorSent-${account.email})`}
                                                        strokeWidth={2}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="inbox"
                                                        name="Landed in Inbox"
                                                        stroke="#10b981"
                                                        fillOpacity={1}
                                                        fill={`url(#colorInbox-${account.email})`}
                                                        strokeWidth={2}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-[200px] w-full flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400">No historical data available</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="grid gap-6">
                    {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <div className="h-20 bg-slate-100 border-b border-slate-200" />
                            <CardContent className="p-6">
                                <div className="grid grid-cols-6 gap-4 mb-8">
                                    {[1, 2, 3, 4, 5, 6].map(j => (
                                        <div key={j} className="h-16 bg-slate-100 rounded-lg" />
                                    ))}
                                </div>
                                <div className="h-[300px] bg-slate-100 rounded-lg" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status, score }: { status: string, score: number }) {
    let colorClass = "bg-slate-100 text-slate-700 hover:bg-slate-100";
    if (status === "Healthy") colorClass = "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200";
    else if (status === "Medium") colorClass = "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200";
    else if (status === "Poor") colorClass = "bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200";

    return (
        <Badge variant="outline" className={cn("px-3 py-1 text-sm font-medium border", colorClass)}>
            {status} ({score}%)
        </Badge>
    );
}

function MiniMetric({ label, value, subtext, icon: Icon, color, bg }: any) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
                <div className={cn("p-1.5 rounded-full", bg, color)}>
                    <Icon className="h-3 w-3" />
                </div>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">{value}</span>
                {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
            </div>
        </div>
    );
}

function MetricCard({ label, value, subtext, icon: Icon, color, iconBg, iconColor }: any) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                    <div className={cn("p-1.5 rounded-lg", iconBg, iconColor)}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                    {subtext && <p className="text-xs font-medium text-slate-500 mt-1">{subtext}</p>}
                </div>
            </CardContent>
        </Card>
    );
}
