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
    Expand
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
import { consolidateLeads } from "@/lib/leads-utils";

const acquisitionData = [
    { name: 'Mon', leads: 400, conv: 240 },
    { name: 'Tue', leads: 300, conv: 139 },
    { name: 'Wed', leads: 500, conv: 380 },
    { name: 'Thu', leads: 280, conv: 190 },
    { name: 'Fri', leads: 590, conv: 430 },
    { name: 'Sat', leads: 320, conv: 210 },
    { name: 'Sun', leads: 450, conv: 320 },
];

export default function MasterDashboard() {
    const [isRepliesModalOpen, setIsRepliesModalOpen] = useState(false);
    const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
    const [dateLabel, setDateLabel] = useState("Last 7 days");

    // Real Data State
    const [leads, setLeads] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalEmails: 0,
        totalWhatsApp: 0,
        totalVoice: 0,
        totalReplies: 0,
        voiceMinutes: 0
    });
    const [loading, setLoading] = useState(true);

    const handleDateUpdate = ({ range, label }: { range: any, label?: string }) => {
        if (label) {
            setDateLabel(label);
        }
        // Date range filtering is handled in the frontend for now
        console.log("Date range updated:", range);
    };

    useEffect(() => {
        const calculateStats = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const rawData = await res.json();

                const flattenedLeads = consolidateLeads(rawData);
                setLeads(flattenedLeads);

                let emailCount = 0;
                let whatsappCount = 0;
                let voiceCount = 0;
                let replyCount = 0;

                flattenedLeads.forEach((lead: any) => {
                    const stages = lead.stages_passed || [];
                    stages.forEach((stage: string) => {
                        const s = stage.toLowerCase();
                        if (s.includes("email")) emailCount++;
                        if (s.includes("whatsapp")) whatsappCount++;
                        if (s.includes("voice")) voiceCount++;
                    });

                    // Check for replies in specific columns as well as general status
                    const isEmailReplied = lead.email_replied && lead.email_replied !== "No" && lead.email_replied !== "none";
                    const isWPReplied = lead.whatsapp_replied && lead.whatsapp_replied !== "No" && lead.whatsapp_replied !== "none";
                    const isGeneralReplied = lead.replied === "Yes";

                    if (isEmailReplied || isWPReplied || isGeneralReplied) {
                        replyCount++;
                    }
                });

                setStats({
                    totalLeads: flattenedLeads.length,
                    totalEmails: emailCount,
                    totalWhatsApp: whatsappCount,
                    totalVoice: voiceCount,
                    voiceMinutes: voiceCount * 2, // Assumption: 2 mins per call
                    totalReplies: replyCount
                });

            } catch (e) {
                console.error("Dashboard fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        calculateStats();
    }, []);

    // Derived Pie Chart Data
    const realServiceDistribution = [
        { name: 'Email', value: stats.totalEmails, color: '#3b82f6' },
        { name: 'WhatsApp', value: stats.totalWhatsApp, color: '#10b981' },
        { name: 'Voice', value: stats.totalVoice, color: '#8b5cf6' },
    ];

    return (
        <div className="space-y-8 pb-10">
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
                />
                <MetricCard
                    title="Total Voice Minutes"
                    value={loading ? "..." : `${stats.voiceMinutes}m`}
                    change="Est. 2m/call"
                    isUp={true}
                    icon={<Activity className="h-6 w-6" />}
                    color="text-orange-600"
                    bg="bg-orange-50"
                    border="border-orange-100"
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
                    <TotalRepliesView leads={leads.filter((l: any) => (l.email_replied && l.email_replied !== "No" && l.email_replied !== "none") || (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") || l.replied === "Yes")} />
                </div>
            )}

            {/* Replies Modal */}
            <Dialog open={isRepliesModalOpen} onOpenChange={setIsRepliesModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Total Replies - Detailed View</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <TotalRepliesView leads={leads.filter((l: any) => (l.email_replied && l.email_replied !== "No" && l.email_replied !== "none") || (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") || l.replied === "Yes")} />
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
                                <AreaChart data={acquisitionData}>
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
        </div>
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
