"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Activity,
    MessageCircle,
    Calendar,
    TrendingUp,
    BarChart3,
    Settings,
    Megaphone,
    Send
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LineChart,
    Line
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useState, useEffect, useMemo } from "react";
import { consolidateLeads, ConsolidatedLead } from "@/lib/leads-utils";
import { useRouter } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { TotalRepliesView } from "@/components/dashboard/total-replies-view";

export default function WhatsappDashboardPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<ConsolidatedLead[]>([]);
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);
    const [stats, setStats] = useState({
        totalLeads: 0,
        contactedLeads: 0,
        totalReplies: 0,
        replied: 0,
        waiting: 0,
        nurture: 0,
        unresponsive: 0
    });
    const [donutData, setDonutData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<any>(undefined);

    useEffect(() => {
        const calculateStats = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const rawData = await res.json();
                const allLeads = consolidateLeads(rawData);
                // Filter: only include leads that have actually been contacted via WhatsApp (matches leads page)
                const whatsappContactedLeads = allLeads.filter(l => l.last_contacted && String(l.last_contacted).trim() !== "");
                setLeads(whatsappContactedLeads);

                // Apply Date Filtering
                const filteredLeads = whatsappContactedLeads.filter((lead: any) => {
                    if (!dateRange?.from) return true;
                    if (!lead.last_contacted) return false;

                    const leadDate = new Date(lead.last_contacted);
                    const from = new Date(dateRange.from);
                    from.setHours(0, 0, 0, 0);
                    const to = dateRange.to ? new Date(dateRange.to) : from;
                    to.setHours(23, 59, 59, 999);

                    return leadDate >= from && leadDate <= to;
                });

                let contactedCount = 0;
                let replyCount = 0;
                let waitingCount = 0;

                const dailyGroups: Record<string, { date: string, sent: number, replied: number }> = {};

                filteredLeads.forEach((l: any) => {
                    const hasWP = l.stages_passed?.some((s: string) => s.toLowerCase().includes("whatsapp")) ||
                        (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") ||
                        [1, 2, 3, 4, 5, 6].some(i => l[`W.P_${i}`] || l.stage_data?.[`WhatsApp ${i}`]) ||
                        l["W.P_FollowUp"] || l.stage_data?.["WhatsApp FollowUp"];

                    if (hasWP) contactedCount++;

                    const isReplied = l.whatsapp_replied &&
                        l.whatsapp_replied !== "No" &&
                        l.whatsapp_replied !== "none" &&
                        String(l.whatsapp_replied).trim() !== "";

                    if (isReplied) {
                        replyCount++;
                    } else if (hasWP) {
                        waitingCount++;
                    }

                    // For Trend
                    if (l.last_contacted || l.created_at) {
                        const d = new Date(l.last_contacted || l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                        if (!dailyGroups[d]) dailyGroups[d] = { date: d, sent: 0, replied: 0 };

                        let leadSentCount = 0;
                        for (let i = 1; i <= 6; i++) {
                            if (l[`W.P_${i}`] || l.stage_data?.[`WhatsApp ${i}`]) leadSentCount++;
                        }
                        if (l["W.P_FollowUp"] || l.stage_data?.["WhatsApp FollowUp"]) leadSentCount++;

                        dailyGroups[d].sent += leadSentCount;
                        if (isReplied) dailyGroups[d].replied += 1;
                    }
                });

                setStats({
                    totalLeads: filteredLeads.length,
                    contactedLeads: contactedCount,
                    totalReplies: replyCount,
                    replied: replyCount,
                    waiting: waitingCount,
                    nurture: 0,
                    unresponsive: filteredLeads.length - contactedCount
                });

                setDonutData([
                    { name: 'Total Leads', value: filteredLeads.length, color: '#8b5cf6' },
                    { name: 'Messages Sent', value: contactedCount, color: '#3b82f6' },
                    { name: 'Total Replies', value: replyCount, color: '#10b981' },
                ]);

                setTrendData(Object.values(dailyGroups)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-7));

            } catch (e) {
                console.error("Dashboard fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        calculateStats();
    }, [dateRange]);

    const repliedLeads = useMemo(() => {
        return leads.filter(l => l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none");
    }, [leads]);

    return (
        <div className="space-y-8 pb-10">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Overview</h1>
                    <p className="text-slate-500 text-sm">Real-time engagement insights and campaign totals</p>
                </div>
                <DateRangePicker onUpdate={(range) => setDateRange(range.range)} />
            </div>

            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Leads"
                    value={loading ? "..." : stats.totalLeads.toLocaleString()}
                    icon={Users}
                    theme="purple"
                    onClick={() => router.push('/dashboard/whatsapp/leads')}
                />
                <MetricCard
                    title="Total Replies"
                    value={loading ? "..." : stats.totalReplies.toLocaleString()}
                    icon={MessageCircle}
                    theme="emerald"
                    onClick={() => setIsRepliesOpen(true)}
                />
                <MetricCard
                    title="Messages Sent"
                    value={loading ? "..." : stats.contactedLeads.toLocaleString()}
                    icon={Send}
                    theme="blue"
                />
            </div>

            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Engagement Donut */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-slate-500" />
                            <CardTitle className="text-sm font-bold text-slate-700 uppercase">Conversion Funnel</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <SummaryPill label="Total Leads" value={stats.totalLeads} color="bg-purple-600" />
                            <SummaryPill label="Messages Sent" value={stats.contactedLeads} color="bg-blue-600" />
                            <SummaryPill label="Total Replies" value={stats.replied} color="bg-emerald-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Activity Trend Line Chart */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-slate-500" />
                            <CardTitle className="text-sm font-bold text-slate-700 uppercase">Activity Trend</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="replied" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-8 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-4 bg-blue-600 rounded-full" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Messages Sent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-4 bg-emerald-600 rounded-full" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Replies Received</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Replies Sheet */}
            <Sheet open={isRepliesOpen} onOpenChange={setIsRepliesOpen}>
                <SheetContent side="right" className="sm:max-w-[800px] w-[90vw] overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-2xl font-bold">Recent WhatsApp Replies</SheetTitle>
                        <SheetDescription>
                            A detailed breakdown of all leads who have engaged with your campaigns.
                        </SheetDescription>
                    </SheetHeader>
                    <TotalRepliesView leads={repliedLeads} />
                </SheetContent>
            </Sheet>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, theme, desc, onClick }: any) {
    const themes: any = {
        purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", iconBg: "bg-purple-100/50" },
        blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", iconBg: "bg-blue-100/50" },
        emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", iconBg: "bg-emerald-100/50" },
        orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", iconBg: "bg-orange-100/50" },
    };

    const t = themes[theme] || themes.purple;

    return (
        <Card
            className={`border ${t.border} shadow-sm bg-white overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.98]' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${t.iconBg} ${t.text}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">{desc}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function SummaryPill({ label, value, color }: any) {
    return (
        <div className={`p-4 rounded-xl flex flex-col items-center justify-center text-white ${color} shadow-sm`}>
            <span className="text-2xl font-black">{value}</span>
            <span className="text-[10px] uppercase font-bold opacity-90 text-center leading-tight tracking-wider">{label}</span>
        </div>
    );
}

function StatusCard({ title, value, borderColor, accentColor }: any) {
    return (
        <Card className={`bg-white border-l-4 ${borderColor} border-y border-r border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all`}>
            <CardContent className="p-5">
                <p className={`text-[10px] font-black uppercase tracking-widest ${accentColor} mb-2`}>{title}</p>
                <h3 className="text-2xl font-black text-slate-900">{value}</h3>
            </CardContent>
        </Card>
    );
}
