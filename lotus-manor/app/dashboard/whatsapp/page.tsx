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
    Megaphone
} from "lucide-react";
import Link from "next/link";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from "recharts";

const donutData = [
    { name: 'Total Leads', value: 35, color: '#8b5cf6' }, // Purple
    { name: 'Replied', value: 19, color: '#10b981' },     // Teal/Green
    { name: 'Meetings', value: 20, color: '#f97316' },    // Orange
];

const activityData = [
    { name: 'Total Leads', value: 35, fill: '#8b5cf6' },
    { name: 'Msgs Sent', value: 16, fill: '#14b8a6' },
    { name: 'Active Camp', value: 3, fill: '#3b82f6' },
    { name: 'Meetings', value: 20, fill: '#f97316' },
];

export default function WhatsappDashboardPage() {
    return (
        <div className="space-y-8 pb-10">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Overview</h1>
                    <p className="text-slate-500">Real-time insights and campaign management</p>
                </div>
                
            </div>

            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Leads"
                    value="35"
                    icon={Users}
                    theme="purple"
                />
                <MetricCard
                    title="Active Campaigns"
                    value="3"
                    icon={Activity}
                    theme="blue"
                />
                <MetricCard
                    title="Messages Sent"
                    value="16"
                    icon={MessageCircle}
                    theme="teal"
                />
                <MetricCard
                    title="Meetings Booked"
                    value="20"
                    icon={Calendar}
                    theme="orange"
                />
            </div>

            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Conversion Funnel */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-slate-700" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Conversion Funnel</CardTitle>
                                <CardDescription>Click on any segment to view leads in that stage</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {donutData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legend / Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <SummaryPill label="Total Leads" value="35" color="bg-purple-900" />
                            <SummaryPill label="Replied" value="19" color="bg-emerald-800" />
                            <SummaryPill label="Meetings" value="20" color="bg-orange-800" />
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Activity Overview */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-slate-700" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Activity Overview</CardTitle>
                                <CardDescription>Compare all metrics at a glance</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                        {activityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <SummaryPill label="Total Leads" value="35" color="bg-purple-600" />
                            <SummaryPill label="Msgs Sent" value="16" color="bg-teal-600" />
                            <SummaryPill label="Active Camp" value="3" color="bg-blue-600" />
                            <SummaryPill label="Meetings" value="20" color="bg-orange-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom: Leads by Status */}
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <h3 className="text-lg font-bold">Leads by Status</h3>
                    <p className="text-purple-100 text-sm">Click on any status to view those leads</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatusCard title="REPLIED" value="19" borderColor="border-emerald-500" accentColor="text-emerald-400" />
                    <StatusCard title="WAITING FOR REPLY" value="4" borderColor="border-orange-500" accentColor="text-orange-400" />
                    <StatusCard title="NURTURE EMAIL SENT" value="0" borderColor="border-amber-700" accentColor="text-amber-600" />
                    <StatusCard title="UNRESPONSIVE" value="0" borderColor="border-red-500" accentColor="text-red-400" />
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, icon: Icon, theme }: any) {
    const themes: any = {
        purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", iconBg: "bg-purple-100" },
        blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", iconBg: "bg-blue-100" },
        teal: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-200", iconBg: "bg-teal-100" },
        orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", iconBg: "bg-orange-100" },
    };

    const t = themes[theme] || themes.purple;

    return (
        <Card className={`border ${t.border} shadow-sm cursor-pointer hover:shadow-md transition-all`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <div className={`p-2 rounded-lg w-fit mb-3 ${t.iconBg} ${t.text}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
                        <p className="text-sm font-semibold text-slate-700 mt-1">{title}</p>
                        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function SummaryPill({ label, value, color }: any) {
    return (
        <div className={`p-3 rounded-lg flex flex-col items-center justify-center text-white ${color}`}>
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-[10px] uppercase font-medium opacity-80 text-center leading-tight">{label}</span>
        </div>
    );
}

function StatusCard({ title, value, borderColor, accentColor }: any) {
    return (
        <Card className={`bg-white border-l-4 ${borderColor} border-y border-r border-slate-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all`}>
            <CardContent className="p-4">
                <p className={`text-xs font-bold uppercase tracking-wider ${accentColor} mb-1`}>{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                
            </CardContent>
        </Card>
    );
}
