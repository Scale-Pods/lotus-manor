"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users,
    Mail,
    MessageCircle,
    Phone,
    TrendingUp,
    Zap,
    BarChart3,
    PieChart as PieChartIcon,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Maximize2,
    Minimize2,
    X,
    Expand,
    Wallet
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TotalRepliesView } from "@/components/dashboard/total-replies-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { calculateDuration, formatDuration } from "@/lib/utils";
import { LMLoader } from "@/components/lm-loader";
import { useData } from "@/context/DataContext";



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


export default function MasterDashboard() {
    const [isRepliesModalOpen, setIsRepliesModalOpen] = useState(false);
    const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
    const [dateLabel, setDateLabel] = useState("Last 7 Days");
    const [dateRange, setDateRange] = useState<any>({
        from: subDays(new Date(), 7),
        to: new Date()
    });

    const { leads: allLeads, calls: allCalls, allTimeVoiceCount, loadingLeads, loadingCalls, refreshLeads, refreshCalls, refreshAll, maqsamBalance, loadingBalances } = useData();
    const [leads, setLeads] = useState<any[]>([]);
    const [acquisitionChartData, setAcquisitionChartData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalEmails: 0,
        totalWhatsApp: 0,
        totalVoice: 0,
        totalReplies: 0,
        voiceMinutesString: "0m",
        totalVoiceSeconds: 0,
        totalVoiceCalls: 0,
        whatsappUniqueSent: 0
    });
    const [replyLeads, setReplyLeads] = useState<any[]>([]);
    const loading = loadingLeads || loadingCalls;

    // Trigger server-side refresh when date range changes
    useEffect(() => {
        if (!refreshCalls || !refreshLeads) return;
        
        const params = {
            from: dateRange?.from,
            to: dateRange?.to,
            includeElevenLabs: false, // Default dashboard doesn't need EL
            provider: 'vapi' // Matches Voice Dashboard default
        };
        
        refreshCalls(params);
        refreshLeads(params);
    }, [dateRange, refreshCalls, refreshLeads]);

    const handleDateUpdate = ({ range, label }: { range: any, label?: string }) => {
        if (label) {
            setDateLabel(label);
        }
        setDateRange(range);
    };

    useEffect(() => {
        const calculateStats = async () => {
            if (loadingLeads) return;

            try {
                const fromDate = dateRange?.from ? startOfDay(new Date(dateRange.from)) : null;
                const toDate = dateRange?.to ? endOfDay(new Date(dateRange.to)) : (fromDate ? endOfDay(new Date(fromDate)) : null);

                const isWithinRange = (d: Date | null) => {
                    if (!fromDate || !toDate) return true; // All time
                    if (!d) return false;
                    return d >= fromDate && d <= toDate;
                };

                const getLeadLatestWPActivity = (lead: any) => {
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

                // Apply Date Filtering for Leads (Created In Range)
                const filteredLeads = allLeads.filter((lead: any) => {
                    const leadDate = new Date(lead.created_at || 0);
                    return isWithinRange(leadDate);
                });

                setLeads(filteredLeads);

                // Acquisition Chart
                const acquisitionMap: { [key: string]: number } = {};
                let startDate = dateRange?.from ? new Date(dateRange.from) : null;
                let endDate = dateRange?.to ? new Date(dateRange.to) : new Date();

                if (!startDate) {
                    startDate = subDays(new Date(), 7);
                }

                const current = new Date(startDate);
                current.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);

                while (current <= end) {
                    const dateStr = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    acquisitionMap[dateStr] = 0;
                    current.setDate(current.getDate() + 1);
                }

                filteredLeads.forEach((lead: any) => {
                    const date = new Date(lead.created_at || Date.now());
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (acquisitionMap[dateStr] !== undefined) acquisitionMap[dateStr]++;
                });

                setAcquisitionChartData(Object.entries(acquisitionMap).map(([name, leads]) => ({ name, leads })));

                // 1. Total Leads (specifically from master_leads table)
                const masterLeads = allLeads.filter((l: any) => 
                    (l.source_loop === "Master Leads" || l.source_loop === "Master") && 
                    isWithinRange(new Date(l.created_at))
                );

                // 2. Total WhatsApp Chats (W.P_1 from loops)
                let whatsappChatsCount = 0;
                allLeads.forEach((lead: any) => {
                    // Only from Intro, Followup, Nurture loops
                    if (lead.source_loop === "Master Leads" || lead.source_loop === "Master") return;
                    
                    const wp1Val = lead["W.P_1"] || lead.stage_data?.["WhatsApp 1"];
                    if (wp1Val && String(wp1Val).trim()) {
                        const parsed = parseMsg(wp1Val);
                        const d = parsed.date || new Date(lead.updated_at || lead.created_at);
                        if (isWithinRange(d)) whatsappChatsCount++;
                    }
                });

                // 3. Total Replies (WP_Replied_track from loops)
                let totalRepliesCount = 0;
                const leadsWhoRepliedInRange: any[] = [];
                allLeads.forEach((lead: any) => {
                    // Only from Intro, Followup, Nurture loops
                    if (lead.source_loop === "Master Leads" || lead.source_loop === "Master") return;

                    const replyVal = lead["WP_Replied_track"];
                    if (replyVal && String(replyVal).trim()) {
                        const parsed = parseMsg(replyVal);
                        const d = parsed.date || new Date(lead.updated_at || lead.created_at);
                        if (isWithinRange(d)) {
                            totalRepliesCount++;
                            leadsWhoRepliedInRange.push(lead);
                        }
                    }
                });

                // Call Data (Using All-Time count from DataContext)
                let totalVoiceSeconds = 0;
                let totalVoiceCallsCount = allTimeVoiceCount;

                if (!loadingCalls && Array.isArray(allCalls)) {
                    totalVoiceSeconds = allCalls.reduce((acc, call) => acc + calculateDuration(call), 0);
                }

                // Outreach (Emails - keeping existing logic but simplified)
                let emailCount = 0;
                allLeads.forEach((lead: any) => {
                    const stages = lead.stages_passed || [];
                    const stageData = lead.stage_data || {};
                    stages.forEach((stage: string) => {
                        if (stage.toLowerCase().trim().startsWith("email_")) {
                            const d = parseMsg(stageData[stage]).date || new Date(lead.updated_at || lead.created_at);
                            if (isWithinRange(d)) emailCount++;
                        }
                    });
                });

                setLeads(masterLeads);
                setReplyLeads(leadsWhoRepliedInRange);

                setStats({
                    totalLeads: masterLeads.length,
                    totalEmails: emailCount,
                    totalWhatsApp: whatsappChatsCount,
                    whatsappUniqueSent: whatsappChatsCount,
                    totalVoice: totalVoiceCallsCount,
                    voiceMinutesString: formatDuration(totalVoiceSeconds),
                    totalVoiceSeconds: totalVoiceSeconds,
                    totalVoiceCalls: totalVoiceCallsCount,
                    totalReplies: totalRepliesCount
                });

            } catch (e) {
                console.error("Dashboard calculation error", e);
            }
        };

        calculateStats();
    }, [dateRange, allLeads, allCalls, loadingLeads, loadingCalls]);

    const router = useRouter();

    // Derived Pie Chart Data
    const realServiceDistribution = [
        { name: 'Email', value: stats.totalEmails, color: '#3b82f6' },
        { name: 'WhatsApp', value: stats.totalWhatsApp, color: '#10b981' },
        { name: 'Voice', value: stats.totalVoice, color: '#8b5cf6' },
    ];

    return (
        <div className="space-y-8 pb-10 relative min-h-[500px]">
            {loading && leads.length === 0 && <LMLoader />}
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Overview</h1>
                    <p className="text-slate-500">Holistic view of all your marketing channels performance.</p>
                </div>
                <DateRangePicker onUpdate={handleDateUpdate} />
            </div>

            {/* Top Metric Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

                <MetricCard
                    title="Total Leads"
                    value={loading ? "..." : stats.totalLeads.toLocaleString()}
                    change="Real-time"
                    isUp={true}
                    icon={<Users className="h-6 w-6" />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    border="border-blue-100"
                    onClick={() => router.push('/dashboard/leads')}
                />
                <MetricCard
                    title="Total Emails Sent"
                    value={loading ? "..." : stats.totalEmails.toLocaleString()}
                    change="Real-time"
                    isUp={true}
                    icon={<Mail className="h-6 w-6" />}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    border="border-emerald-100"
                    onClick={() => router.push('/dashboard/email/sent')}
                />
                <MetricCard
                    title="Total WhatsApp Chats"
                    value={loading ? "..." : stats.totalWhatsApp.toLocaleString()}
                    change="Real-time"
                    isUp={true}
                    icon={<MessageCircle className="h-6 w-6" />}
                    color="text-purple-600"
                    bg="bg-purple-50"
                    border="border-purple-100"
                    onClick={() => router.push('/dashboard/whatsapp/chat')}
                />
                <MetricCard
                    title="Total Voice Calls"
                    value={loading ? "..." : stats.totalVoiceCalls.toLocaleString()}
                    change="All Time"
                    isUp={true}
                    icon={<Activity className="h-6 w-6" />}
                    color="text-orange-600"
                    bg="bg-orange-50"
                    border="border-orange-100"
                    onClick={() => router.push('/dashboard/voice')}
                />
                
                <MetricCard
                    title="Total Replies"
                    value={loading ? "..." : stats.totalReplies.toLocaleString()}
                    change={`${stats.totalLeads > 0 ? ((stats.totalReplies / stats.totalLeads) * 100).toFixed(1) : 0}% Rate`}
                    isUp={true}
                    icon={<Expand className="h-6 w-6" />}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    border="border-indigo-100"
                    onClick={() => setIsRepliesModalOpen(true)}
                    action={<Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsRepliesExpanded(!isRepliesExpanded);
                        }}
                    >
                        {isRepliesExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>}
                />
            </div>

            {/* Expanded View Section */}
            {isRepliesExpanded && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Total Replies Details</h2>
                            <p className="text-sm text-slate-500">Detailed view of all replies across channels</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsRepliesExpanded(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Close
                        </Button>
                    </div>
                    <TotalRepliesView leads={replyLeads} />
                </div>
            )}

            {/* Replies Modal */}
            <Dialog open={isRepliesModalOpen} onOpenChange={setIsRepliesModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Total Replies - Detailed View</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <TotalRepliesView leads={replyLeads} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Charts Row 1: Lead Acquisition & Service Distribution */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Lead Acquisition Area Chart */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Lead Acquisition</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="w-full" style={{ height: 350, minHeight: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={acquisitionChartData}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Service Distribution Pie Chart */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <PieChartIcon className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg">Response Performance!</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col items-center justify-center">
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={realServiceDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {realServiceDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

function MetricCard({ title, value, change, isUp, icon, color, bg, border, onClick, action, subtitle }: {
    title: string,
    value: string,
    change: string,
    isUp: boolean,
    icon: React.ReactNode,
    color: string,
    bg: string,
    border: string,
    onClick?: () => void,
    action?: React.ReactNode,
    subtitle?: string
}) {
    return (
        <Card
            className={`bg-white border ${border} shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mr-2">
                            <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
                            {subtitle && <p className="text-xs text-slate-400 mb-2">{subtitle}</p>}
                            {action && <div className="z-20">{action}</div>}
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
                        <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {change}
                        </div>
                    </div>
                    <div className={`p-4 rounded-2xl ${bg} ${color} shadow-sm`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
