"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, DollarSign, CheckCircle, Search, Loader2 } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { calculateDuration } from "@/lib/utils";

import { startOfDay } from "date-fns";

export default function VoiceAnalyticsPage() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [allCalls, setAllCalls] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<any>(undefined);

    // Processed Data States
    const [volumeData, setVolumeData] = useState<any[]>([]);
    const [durationData, setDurationData] = useState<any[]>([]);
    const [costData, setCostData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalCalls: 0,
        avgDuration: 0,
        totalCost: 0,
        successRate: 0
    });

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/calls');
                if (!res.ok) throw new Error("Failed");
                const fetchedCalls = await res.json();
                setAllCalls(fetchedCalls);
            } catch (err) {
                console.error("Fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    useEffect(() => {
        // Filter by date range if set
        const filteredCalls = allCalls.filter((call: any) => {
            if (!dateRange?.from) return true;
            if (!call.startedAt) return false;
            const callDate = new Date(call.startedAt);
            const from = startOfDay(new Date(dateRange.from));
            const to = dateRange.to ? startOfDay(new Date(dateRange.to)) : from;
            to.setHours(23, 59, 59, 999);

            return callDate >= from && callDate <= to;
        });

        setCalls(filteredCalls);
        processAnalytics(filteredCalls);
    }, [allCalls, dateRange]);

    const processAnalytics = (data: any[]) => {
        // Quick Stats
        const totalCalls = data.length;
        const totalDuration = data.reduce((acc: number, c: any) => acc + calculateDuration(c), 0);
        const totalCost = data.reduce((acc: number, c: any) => acc + (c.cost || 0), 0);
        const successCount = data.filter((c: any) => c.status === 'ended' || c.status === 'completed').length;

        setStats({
            totalCalls,
            avgDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
            totalCost,
            successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0
        });

        // Charts
        const dayMap = new Map();
        const durationBuckets = { '0-30s': 0, '30s-1m': 0, '1m-2m': 0, '2m-5m': 0, '5m+': 0 };

        data.forEach(call => {
            const time = call.startedAt ? format(parseISO(call.startedAt), 'MMM dd') : 'N/A';
            dayMap.set(time, (dayMap.get(time) || 0) + 1);

            const dur = calculateDuration(call);
            if (dur < 30) durationBuckets['0-30s']++;
            else if (dur < 60) durationBuckets['30s-1m']++;
            else if (dur < 120) durationBuckets['1m-2m']++;
            else if (dur < 300) durationBuckets['2m-5m']++;
            else durationBuckets['5m+']++;
        });

        // Volume Chart (Line)
        const vData = Array.from(dayMap.entries()).map(([name, value]) => ({ name, value })).reverse();
        setVolumeData(vData);

        // Duration Chart (Bar)
        const dData = Object.entries(durationBuckets).map(([name, value]) => ({ name, value }));
        setDurationData(dData);

        // Cost Chart (Placeholder logic: divide cost over buckets or days. Using Volume days for simplicty)
        // If we want detailed cost over time, we'd recalc aggregations. 
        // For now, let's map volume days to cost for those days.
        const cData = Array.from(dayMap.keys()).map(day => {
            const dayCost = data.filter(c => c.startedAt && format(parseISO(c.startedAt), 'MMM dd') === day)
                .reduce((acc, c) => acc + (c.cost || 0), 0);
            return { name: day, value: parseFloat(dayCost.toFixed(2)) };
        }).reverse();
        setCostData(cData);

    };

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Voice Analytics</h1>
                    <p className="text-slate-500">Comprehensive insights into voice agent performance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DateRangePicker onUpdate={(values) => setDateRange(values.range)} />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] bg-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Key Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Calls" value={stats.totalCalls} change="+0%" icon={<Phone className="h-5 w-5" />} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="Avg Duration" value={`${Math.round(stats.avgDuration)}s`} change="0%" icon={<Clock className="h-5 w-5" />} color="text-purple-600" bg="bg-purple-50" />
                <StatCard title="Total Cost" value={`$${stats.totalCost.toFixed(2)}`} change="+0%" icon={<DollarSign className="h-5 w-5" />} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard title="Success Rate" value={`${stats.successRate}%`} change="+0%" icon={<CheckCircle className="h-5 w-5" />} color="text-orange-600" bg="bg-orange-50" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Call Volume Trends */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Call Volume Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={volumeData.length ? volumeData : [{ name: 'No data', value: 0 }]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Call Duration Distribution */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Duration Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={durationData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Cost Analysis */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Cost Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={costData.length ? costData : [{ name: 'No data', value: 0 }]}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>



                {/* Performance Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Top Call Reasons</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Topic</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Appointment Booking</TableCell>
                                        <TableCell className="text-right font-bold">45</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">General Inquiry</TableCell>
                                        <TableCell className="text-right font-bold">30</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Reschedule</TableCell>
                                        <TableCell className="text-right font-bold">10</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Cancellation</TableCell>
                                        <TableCell className="text-right font-bold">5</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Response Time Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="font-medium text-slate-700">First Response Time</p>
                                        <p className="font-bold text-2xl text-slate-900">2.3s</p>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full w-[40%] bg-blue-500 rounded-full"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="font-medium text-slate-700">Follow-up Latency</p>
                                        <p className="font-bold text-2xl text-slate-900">1.8s</p>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full w-[30%] bg-emerald-500 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span>Target: &lt;3s</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span>Target: &lt;2s</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change, icon, color, bg, isNegative }: any) {
    return (
        <Card className="border-slate-200">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{title}</p>
                        <h3 className="text-2xl font-bold text-slate-950 mt-1">{value}</h3>
                        <span className={`text-xs font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {change} {isNegative ? '↓' : '↑'}
                        </span>
                    </div>
                    <div className={`p-4 rounded-2xl ${bg} ${color}`}>{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
}
