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
import { useRouter } from "next/navigation";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { useData } from "@/context/DataContext";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { TotalRepliesView } from "@/components/dashboard/total-replies-view";

import { LMLoader } from "@/components/lm-loader";

export default function WhatsappDashboardPage() {
    const router = useRouter();
    const { leads: allLeads, loadingLeads } = useData();
    const [leads, setLeads] = useState<any[]>([]);
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
    const loading = loadingLeads;
    const [dateRange, setDateRange] = useState<any>(undefined);

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

    // --- Sorting & Activity Helpers ---
    const getMsgDate = (raw: any) => {
        if (!raw || !String(raw).trim()) return null;
        const content = String(raw).trim();
        const isoRegex = /\n\n(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+)$/;
        const isoMatch = content.match(isoRegex);
        if (isoMatch) return new Date(isoMatch[1]);
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1].trim();
        const lastLineDate = new Date(lastLine.replace(' ', 'T'));
        if (lines.length > 1 && !isNaN(lastLineDate.getTime()) && lastLine.includes('-') && lastLine.includes(':')) {
            return lastLineDate;
        }
        return null;
    };

    const getLeadLatestActivity = (lead: any) => {
        let latestDate = new Date(lead.created_at);
        for (let i = 1; i <= 12; i++) {
            const tsRaw = lead[`W.P_${i} TS`];
            let d = getMsgDate(lead[`W.P_${i}`] || lead.stage_data?.[`WhatsApp ${i}`]);
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
            if (d && d > latestDate) latestDate = d;
        }
        const rd = getMsgDate(lead.whatsapp_replied || lead.stage_data?.["WhatsApp Replied"]);
        if (rd && rd > latestDate) latestDate = rd;
        const fd = getMsgDate(lead["W.P_FollowUp"] || lead.stage_data?.["WhatsApp FollowUp"]);
        if (fd && fd > latestDate) latestDate = fd;
        for (let i = 1; i <= 10; i++) {
            const dReplied = getMsgDate(lead[`W.P_Replied_${i}`]);
            if (dReplied && dReplied > latestDate) latestDate = dReplied;
            const dFollow = getMsgDate(lead[`W.P_FollowUp_${i}`]);
            if (dFollow && dFollow > latestDate) latestDate = dFollow;
        }
        return latestDate;
    };

    useEffect(() => {
        const calculateStats = async () => {
            if (loadingLeads) return;

            try {
                // Filter: only include leads that have actually been contacted via WhatsApp (matches leads page)
                // Filter: only include leads that have actually been contacted via WhatsApp (matches Chat view)
                const whatsappContactedLeads = allLeads.filter(l => {
                    const lead = l as any;
                    if (lead.stages_passed.some((s: string) => s.toLowerCase().includes("whatsapp"))) return true;
                    if (lead.whatsapp_replied && lead.whatsapp_replied !== "No" && lead.whatsapp_replied !== "none") return true;
                    for (let i = 1; i <= 10; i++) {
                        const r = lead[`W.P_Replied_${i}`];
                        if (r && String(r).toLowerCase() !== "no" && String(r).toLowerCase() !== "none") return true;
                        if (lead[`W.P_FollowUp_${i}`]) return true;
                    }
                    for (let i = 1; i <= 12; i++) {
                        if (lead[`W.P_${i}`] || lead.stage_data?.[`WhatsApp ${i}`]) return true;
                    }
                    return false;
                });

                // Apply Exact Date Filtering (Same as Chat view)
                const fromDate = dateRange?.from ? startOfDay(new Date(dateRange.from)) : null;
                const toDate = dateRange?.to ? endOfDay(new Date(dateRange.to)) : (fromDate ? endOfDay(new Date(fromDate)) : null);

                const isWithinRange = (d: Date | null) => {
                    if (!fromDate || !toDate) return true; // All time
                    if (!d) return false;
                    return d >= fromDate && d <= toDate;
                };

                // Filter down total leads using exact activity timestamp
                const filteredLeads = whatsappContactedLeads.filter((lead: any) => {
                    if (!dateRange?.from) return true;
                    const latestActivity = getLeadLatestActivity(lead);
                    return isWithinRange(latestActivity);
                });

                const dailyGroups: Record<string, { date: string, sent: number, replied: number }> = {};

                const finalStats = {
                    totalLeads: filteredLeads.length,
                    messagesSent: 0,
                    uniqueLeadsContacted: 0,
                    totalReplies: 0,
                    waiting: 0,
                    unresponsive: 0
                };

                filteredLeads.forEach((lead: any) => {
                    const stageData = lead.stage_data || {};
                    let leadSentCount = 0;
                    let hasWPInDate = false;

                    // Message Sent Detection (Matching Master Dashboard Logic)
                    // Check if lead was actually sent a message in this range
                    for (let i = 1; i <= 12; i++) {
                        const d = parseMsg(lead[`W.P_${i}`] || stageData[`WhatsApp ${i}`]).date;
                        if (d && isWithinRange(d)) {
                            leadSentCount++;
                            hasWPInDate = true;
                        }
                    }
                    if (lead["W.P_FollowUp"] || stageData["WhatsApp FollowUp"]) {
                        const d = parseMsg(lead["W.P_FollowUp"] || stageData["WhatsApp FollowUp"]).date;
                        if (d && isWithinRange(d)) {
                            leadSentCount++;
                            hasWPInDate = true;
                        }
                    }
                    for (let i = 1; i <= 10; i++) {
                        const d = parseMsg(lead[`W.P_FollowUp_${i}`]).date;
                        if (d && isWithinRange(d)) {
                            leadSentCount++;
                            hasWPInDate = true;
                        }
                    }

                    if (hasWPInDate) {
                        finalStats.messagesSent += leadSentCount;
                        finalStats.uniqueLeadsContacted++;
                    }

                    // Reply Detection (Matching Master Dashboard Logic)
                    let isRepliedInRange = false;
                    const checkWPDate = (raw: any) => {
                        if (!raw || ["no", "none", ""].includes(String(raw).toLowerCase().trim())) return null;
                        const parsed = parseMsg(raw);
                        return parsed.date;
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
                        finalStats.totalReplies++;
                    } else if (hasWPInDate) {
                        finalStats.waiting++;
                    }

                    // Trend
                    const latestAct = getLeadLatestActivity(lead);
                    if (latestAct) {
                        const dStr = latestAct.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        if (!dailyGroups[dStr]) dailyGroups[dStr] = { date: dStr, sent: 0, replied: 0 };
                        dailyGroups[dStr].sent += leadSentCount;
                        if (isRepliedInRange) dailyGroups[dStr].replied += 1;
                    }
                });

                setStats({
                    totalLeads: finalStats.totalLeads,
                    contactedLeads: finalStats.messagesSent,
                    totalReplies: finalStats.totalReplies,
                    replied: finalStats.totalReplies,
                    waiting: finalStats.waiting,
                    nurture: 0,
                    unresponsive: finalStats.totalLeads - finalStats.uniqueLeadsContacted
                });

                setDonutData([
                    { name: 'Total Leads', value: finalStats.totalLeads, color: '#8b5cf6' },
                    { name: 'Messages Sent', value: finalStats.messagesSent, color: '#3b82f6' },
                    { name: 'Total Replies', value: finalStats.totalReplies, color: '#10b981' },
                ]);

                setTrendData(Object.values(dailyGroups)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-7));

                // Sync the actual filtered leads to state for the modal/sheet 
                setLeads(filteredLeads);

            } catch (e) {
                console.error("Dashboard calculation error", e);
            }
        };

        calculateStats();
    }, [dateRange, allLeads, loadingLeads]);

    const repliedLeads = useMemo(() => {
        // Now accurately filters by the leads active in range that have a reply in range
        return leads.filter(lead => {
            const checkWPDate = (raw: any) => {
                if (!raw || ["no", "none", ""].includes(String(raw).toLowerCase().trim())) return null;
                const parsed = parseMsg(raw);
                return parsed.date;
            };

            const fromDate = dateRange?.from ? startOfDay(new Date(dateRange.from)) : null;
            const toDate = dateRange?.to ? endOfDay(new Date(dateRange.to)) : (fromDate ? endOfDay(new Date(fromDate)) : null);
            const isWithinRange = (d: Date | null) => {
                if (!fromDate || !toDate) return true;
                if (!d) return false;
                return d >= fromDate && d <= toDate;
            };

            let latestWPReplyDate: Date | null = checkWPDate(lead.whatsapp_replied);
            for (let i = 1; i <= 10; i++) {
                const d = checkWPDate(lead[`W.P_Replied_${i}`]);
                if (d && (!latestWPReplyDate || d > latestWPReplyDate)) latestWPReplyDate = d;
            }
            
            return latestWPReplyDate && isWithinRange(latestWPReplyDate);
        });
    }, [leads, dateRange]);

    return (
        <div className="space-y-8 pb-10 relative min-h-[500px]">
            {loading && <LMLoader />}
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
