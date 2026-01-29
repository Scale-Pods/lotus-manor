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
    Activity
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

const acquisitionData = [
    { name: 'Mon', leads: 400, conv: 240 },
    { name: 'Tue', leads: 300, conv: 139 },
    { name: 'Wed', leads: 500, conv: 380 },
    { name: 'Thu', leads: 280, conv: 190 },
    { name: 'Fri', leads: 590, conv: 430 },
    { name: 'Sat', leads: 320, conv: 210 },
    { name: 'Sun', leads: 450, conv: 320 },
];

const serviceDistributionData = [
    { name: 'Email', value: 45, color: '#3b82f6' },
    { name: 'WhatsApp', value: 35, color: '#10b981' },
    { name: 'Voice', value: 20, color: '#8b5cf6' },
];

const weeklyPerformance = [
    { name: 'Week 1', total: 1200 },
    { name: 'Week 2', total: 1900 },
    { name: 'Week 3', total: 1540 },
    { name: 'Week 4', total: 2400 },
];

export default function MasterDashboard() {
    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Overview</h1>
                    <p className="text-slate-500">Holistic view of all your marketing channels performance.</p>
                </div>
                <DateRangePicker />
            </div>

            {/* Top Metric Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Leads"
                    value="13,331"
                    change="+12.5%"
                    isUp={true}
                    icon={<Users className="h-6 w-6" />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    border="border-blue-100"
                />
                <MetricCard
                    title="Emails Sent"
                    value="42,881"
                    change="+18.2%"
                    isUp={true}
                    icon={<Mail className="h-6 w-6" />}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    border="border-emerald-100"
                />
                <MetricCard
                    title="WhatsApp Active"
                    value="1,076"
                    change="+5.4%"
                    isUp={true}
                    icon={<MessageCircle className="h-6 w-6" />}
                    color="text-purple-600"
                    bg="bg-purple-50"
                    border="border-purple-100"
                />
                <MetricCard
                    title="Voice Minutes"
                    value="452m"
                    change="-2.1%"
                    isUp={false}
                    icon={<Phone className="h-6 w-6" />}
                    color="text-orange-600"
                    bg="bg-orange-50"
                    border="border-orange-100"
                />
            </div>

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
                            <CardTitle className="text-lg">Channel Share</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col items-center justify-center">
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={serviceDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {serviceDistributionData.map((entry, index) => (
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

function MetricCard({ title, value, change, isUp, icon, color, bg, border }: {
    title: string,
    value: string,
    change: string,
    isUp: boolean,
    icon: React.ReactNode,
    color: string,
    bg: string,
    border: string
}) {
    return (
        <Card className={`bg-white border ${border} shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-300`}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
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
