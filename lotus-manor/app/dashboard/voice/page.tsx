"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Phone, Clock, DollarSign, TrendingUp, Calendar as CalendarIcon, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import React from "react";
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

const dailyCallVolumeData = [
    { name: 'Jan 27', calls: 2 },
    { name: 'Jan 28', calls: 1 },
];

const hourlyCallDistributionData = [
    { name: '00:00', calls: 0 },
    { name: '03:00', calls: 0 },
    { name: '06:00', calls: 1 },
    { name: '09:00', calls: 3 },
    { name: '12:00', calls: 2 },
    { name: '15:00', calls: 1 },
    { name: '18:00', calls: 0 },
    { name: '21:00', calls: 0 },
];

export default function VoiceDashboardPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Voice Agent Dashboard</h1>
                    <p className="text-slate-500">Monitor your AI voice agent performance.</p>
                </div>
                <div className="flex items-center gap-4">
                    
                </div>
            </div>

            {/* Filters Section */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="justify-start text-left font-normal bg-slate-50 border-input hover:bg-slate-100 gap-2 px-3">
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                            <span className="text-slate-700">22 Jan 26 - 29 Jan 26</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard title="Total Executions" value="3 calls" badge="3 completed" icon={<Phone className="h-5 w-5 text-white" />} />
                <MetricCard title="Total Duration" value="6:17 min" icon={<Clock className="h-5 w-5 text-white" />} />
                <MetricCard title="Average Duration" value="123.33s" icon={<Timer className="h-5 w-5 text-white" />} />
                <MetricCard title="Total Cost" value="$0.53" icon={<DollarSign className="h-5 w-5 text-white" />} />
                <MetricCard title="Average Cost" value="$0.18" icon={<DollarSign className="h-5 w-5 text-white" />} />
                <MetricCard title="Success Rate" value="100%" icon={<TrendingUp className="h-5 w-5 text-white" />} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6">Daily Call Volume</h3>
                        <div className="w-full" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyCallVolumeData}>
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
                                <AreaChart data={hourlyCallDistributionData}>
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
                        {/* We need to ensure the icon color is visible on white background. 
                            Since the icon is passed as a prop, we might need to adjust the prop or handle it here. 
                            However, looking at the usage: icon={<Phone className="h-5 w-5 text-white" />} 
                            The parent component passes text-white. We need to override this in the parent usage.
                        */}
                        {/* Actually, let's fix the parent usage instead of hacking it here. 
                            Or better, clone element to change color? No, let's just update the parent call sites.
                            Wait, I can't update all call sites in one go with this tool easily if they are scattered.
                            But they are all in the same file for Voice Dashboard.
                        */}
                        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-5 w-5 text-slate-600" }) : icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
