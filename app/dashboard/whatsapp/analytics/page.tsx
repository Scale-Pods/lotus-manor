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
    BarChart,
    Bar,
    Cell
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TrendingUp, Users, MessageSquare, Send, RefreshCw, BarChart3 } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { ConsolidatedLead } from "@/lib/leads-utils";
import { Button } from "@/components/ui/button";
import { LMLoader } from "@/components/lm-loader";
import { useData } from "@/context/DataContext";

export default function WhatsappAnalyticsPage() {
    const { leads: allLeads, loadingLeads } = useData();
    const [leads, setLeads] = useState<ConsolidatedLead[]>([]);
    const loading = loadingLeads;
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(undefined as any);

    const parseMsg = (raw: any): { date: Date | null, content: string } => {
        if (!raw || !String(raw).trim()) return { date: null, content: "" };
        const content = String(raw).trim();
        const isoRegex = /\n\n(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+)$/;
        const isoMatch = content.match(isoRegex);
        if (isoMatch) {
            return {
                date: new Date(isoMatch[1]),
                content: content.replace(isoRegex, '').trim()
            };
        }
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1].trim();
        const lastLineDate = new Date(lastLine.replace(' ', 'T'));
        if (lines.length > 1 && !isNaN(lastLineDate.getTime()) && lastLine.includes('-') && lastLine.includes(':')) {
            return {
                date: lastLineDate,
                content: lines.slice(0, -1).join('\n').trim()
            };
        }
        return { date: null, content: content };
    };

    const getLeadLatestActivity = (lead: any) => {
        let latest = new Date(lead.created_at);
        const stageData = lead.stage_data || {};
        const getD = (raw: any) => parseMsg(raw).date;
        for (let i = 1; i <= 12; i++) {
            let d = getD(lead[`W.P_${i}`] || stageData[`WhatsApp ${i}`]);
            const tsRaw = lead[`W.P_${i} TS`];
            if (!d && tsRaw && tsRaw.includes(' - ')) {
                const parts = tsRaw.split(' - ');
                const datePart = parts[parts.length - 1].trim();
                const tsDate = new Date(datePart.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'));
                if (!isNaN(tsDate.getTime())) {
                    const rawLower = tsRaw.toLowerCase();
                    if (rawLower.includes('read') || rawLower.includes('delivered') || rawLower.includes('failed')) {
                        tsDate.setHours(0, 0, 0, 0); 
                    }
                    d = tsDate;
                }
            }
            if (d && d > latest) latest = d;
        }
        const rd = getD(lead.whatsapp_replied || stageData["WhatsApp Replied"]);
        if (rd && rd > latest) latest = rd;
        const fd = getD(lead["W.P_FollowUp"] || stageData["WhatsApp FollowUp"]);
        if (fd && fd > latest) latest = fd;
        for (let i = 1; i <= 10; i++) {
            const d1 = getD(lead[`W.P_Replied_${i}`]);
            if (d1 && d1 > latest) latest = d1;
            const d2 = getD(lead[`W.P_FollowUp_${i}`]);
            if (d2 && d2 > latest) latest = d2;
        }
        return latest;
    };

    useEffect(() => {
        if (!loadingLeads) {
            setLeads(allLeads);
        }
    }, [allLeads, loadingLeads]);

    const filteredLeads = useMemo(() => {
        const fromDate = dateRange?.from ? startOfDay(new Date(dateRange.from)) : null;
        const toDate = dateRange?.to ? endOfDay(new Date(dateRange.to)) : (fromDate ? endOfDay(new Date(fromDate)) : null);
        const isWithinRange = (d: Date | null) => {
            if (!fromDate || !toDate) return true;
            if (!d) return false;
            return d >= fromDate && d <= toDate;
        };

        return leads.filter(l => {
            const lead = l as any;
            const stageData = lead.stage_data || {};
            const stages = lead.stages_passed || [];

            // Identify WhatsApp Lead
            const isWP = stages.some((s: string) => s.toLowerCase().includes("whatsapp") || s.toLowerCase().includes("w.p")) ||
                (lead.whatsapp_replied && !["no", "none", ""].includes(String(lead.whatsapp_replied).toLowerCase().trim())) ||
                [...Array(12)].some((_, i) => lead[`W.P_${i + 1}`] || stageData[`WhatsApp ${i + 1}`]) ||
                [...Array(10)].some((_, i) => lead[`W.P_Replied_${i + 1}`] || lead[`W.P_FollowUp_${i + 1}`]);

            if (!isWP) return false;

            if (dateRange?.from) {
                const latest = getLeadLatestActivity(lead);
                return isWithinRange(latest);
            }
            return true;
        });
    }, [leads, dateRange]);

    const stats = useMemo(() => {
        let totalSent = 0;
        let repliedCount = 0;
        const loops: Record<string, { value: number }> = {
            "Intro": { value: 0 },
            "Follow Up": { value: 0 },
            "Nurture": { value: 0 }
        };

        const fromDate = dateRange?.from ? startOfDay(new Date(dateRange.from)) : null;
        const toDate = dateRange?.to ? endOfDay(new Date(dateRange.to)) : (fromDate ? endOfDay(new Date(fromDate)) : null);
        const isWithinRange = (d: Date | null) => {
            if (!fromDate || !toDate) return true;
            if (!d) return false;
            return d >= fromDate && d <= toDate;
        };

        filteredLeads.forEach(l => {
            const lead = l as any;
            const stageData = lead.stage_data || {};
            const loopName = lead.source_loop?.toLowerCase().includes("follow up") ? "Follow Up" :
                lead.source_loop?.toLowerCase().includes("nurture") ? "Nurture" : "Intro";

            // Count Sent
            for (let i = 1; i <= 12; i++) {
                const d = parseMsg(lead[`W.P_${i}`] || stageData[`WhatsApp ${i}`]).date;
                if (d && isWithinRange(d)) totalSent++;
            }
            const df = parseMsg(lead["W.P_FollowUp"] || stageData["WhatsApp FollowUp"]).date;
            if (df && isWithinRange(df)) totalSent++;
            for (let i = 1; i <= 10; i++) {
                const ds = parseMsg(lead[`W.P_FollowUp_${i}`]).date;
                if (ds && isWithinRange(ds)) totalSent++;
            }

            // Count Replies
            let isRepliedInRange = false;
            const checkWPDate = (raw: any) => {
                if (!raw || ["no", "none", ""].includes(String(raw).toLowerCase().trim())) return null;
                return parseMsg(raw).date;
            };

            let latestWPReplyDate: Date | null = checkWPDate(lead.whatsapp_replied);
            for (let i = 1; i <= 10; i++) {
                const d = checkWPDate(lead[`W.P_Replied_${i}`]);
                if (d && (!latestWPReplyDate || d > latestWPReplyDate)) latestWPReplyDate = d;
            }
            
            if (latestWPReplyDate && isWithinRange(latestWPReplyDate)) {
                isRepliedInRange = true;
            }

            if (isRepliedInRange) {
                repliedCount++;
                if (loops[loopName]) loops[loopName].value++;
            }
        });

        const replyRate = filteredLeads.length > 0 ? (repliedCount / filteredLeads.length) * 100 : 0;

        return {
            totalSent,
            repliedCount,
            totalLeads: filteredLeads.length,
            replyRate: replyRate.toFixed(1) + "%",
            loopData: Object.entries(loops).map(([name, data]) => ({ name, value: data.value }))
        };
    }, [filteredLeads, dateRange]);

    const trendData = useMemo(() => {
        const groups: Record<string, { date: string, sent: number, replied: number }> = {};
        
        const fromDate = dateRange?.from ? startOfDay(new Date(dateRange.from)) : null;
        const toDate = dateRange?.to ? endOfDay(new Date(dateRange.to)) : (fromDate ? endOfDay(new Date(fromDate)) : null);
        const isWithinRange = (d: Date | null) => {
            if (!fromDate || !toDate) return true;
            if (!d) return false;
            return d >= fromDate && d <= toDate;
        };

        filteredLeads.forEach(l => {
            const lead = l as any;
            const stageData = lead.stage_data || {};
            const latestAct = getLeadLatestActivity(lead);
            if (!latestAct) return;

            const dStr = latestAct.toLocaleDateString([], { month: 'short', day: 'numeric' });
            if (!groups[dStr]) groups[dStr] = { date: dStr, sent: 0, replied: 0 };

            // Sent
            for (let i = 1; i <= 12; i++) {
                const d = parseMsg(lead[`W.P_${i}`] || stageData[`WhatsApp ${i}`]).date;
                if (d && isWithinRange(d)) groups[dStr].sent++;
            }
            const df = parseMsg(lead["W.P_FollowUp"] || stageData["WhatsApp FollowUp"]).date;
            if (df && isWithinRange(df)) groups[dStr].sent++;
            for (let i = 1; i <= 10; i++) {
                const ds = parseMsg(lead[`W.P_FollowUp_${i}`]).date;
                if (ds && isWithinRange(ds)) groups[dStr].sent++;
            }

            // Replies
            let isRepliedInRange = false;
            const checkWPDate = (raw: any) => {
                if (!raw || ["no", "none", ""].includes(String(raw).toLowerCase().trim())) return null;
                return parseMsg(raw).date;
            };

            let latestWPReplyDate: Date | null = checkWPDate(lead.whatsapp_replied);
            for (let i = 1; i <= 10; i++) {
                const d = checkWPDate(lead[`W.P_Replied_${i}`]);
                if (d && (!latestWPReplyDate || d > latestWPReplyDate)) latestWPReplyDate = d;
            }
            
            if (latestWPReplyDate && isWithinRange(latestWPReplyDate)) {
                isRepliedInRange = true;
            }

            if (isRepliedInRange) {
                groups[dStr].replied += 1;
            }
        });
        return Object.values(groups).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);
    }, [filteredLeads, dateRange]);

    return (
        <div className="space-y-6 pb-10 relative min-h-[500px]">
            {loading && <LMLoader />}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Analytics</h1>
                    <p className="text-slate-500 text-sm">Track campaign performance and lead engagement</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker onUpdate={({ range }) => setDateRange({ from: range?.from, to: range?.to })} />
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="h-10">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Messages Sent"
                    value={stats.totalSent.toLocaleString()}
                    icon={Send}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Total Replies"
                    value={stats.repliedCount.toLocaleString()}
                    icon={MessageSquare}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    title="Response Rate"
                    value={stats.replyRate}
                    icon={TrendingUp}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                <StatCard
                    title="Unique Contacted Leads"
                    value={stats.totalLeads.toLocaleString()}
                    icon={Users}
                    color="text-slate-600"
                    bg="bg-slate-50"
                />
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-900">Engagement Trend</CardTitle>
                        <CardDescription className="text-xs">Outbound messages vs Incoming replies</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="h-[300px] w-full">
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
                    <CardContent className="p-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.loopData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={5} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30}>
                                        {stats.loopData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6'][index % 3]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${bg} ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-xl font-bold text-slate-900">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );
}
