"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, DollarSign, CheckCircle, Search } from "lucide-react";
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
import { useState } from "react";

const volumeData = [
    { name: '1', value: 4 },
    { name: '5', value: 6 },
    { name: '10', value: 8 },
    { name: '15', value: 12 },
    { name: '20', value: 9 },
    { name: '25', value: 15 },
    { name: '30', value: 11 },
];

const durationData = [
    { name: '0-30s', value: 45 },
    { name: '30s-1m', value: 80 },
    { name: '1m-2m', value: 120 },
    { name: '2m-5m', value: 60 },
    { name: '5m+', value: 20 },
];

const costData = [
    { name: 'Mon', value: 2.5 },
    { name: 'Tue', value: 3.2 },
    { name: 'Wed', value: 4.8 },
    { name: 'Thu', value: 3.5 },
    { name: 'Fri', value: 5.1 },
    { name: 'Sat', value: 1.2 },
    { name: 'Sun', value: 1.8 },
];

const heatmapData = [
    { hour: '9am', day: 'Mon', value: 80 },
    { hour: '10am', day: 'Mon', value: 90 },
    // Simplified heatmap representation using a bar chart for peak hours in this demo
    { hour: '00', value: 5 },
    { hour: '04', value: 2 },
    { hour: '08', value: 25 },
    { hour: '12', value: 85 },
    { hour: '16', value: 60 },
    { hour: '20', value: 30 },
];

export default function VoiceAnalyticsPage() {
    const [statusFilter, setStatusFilter] = useState("all");

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Voice Analytics</h1>
                    <p className="text-slate-500">Comprehensive insights into voice agent performance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DateRangePicker onUpdate={(range) => console.log("Voice Analytics Date Update:", range)} />

                    <Select value={statusFilter} onValueChange={(val) => {
                        setStatusFilter(val);
                        console.log("Voice Analytics Status Filter:", val);
                    }}>
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
                <StatCard title="Total Calls" value="90" change="+12%" icon={<Phone className="h-5 w-5" />} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="Avg Duration" value="1m 23s" change="-5%" isNegative icon={<Clock className="h-5 w-5" />} color="text-purple-600" bg="bg-purple-50" />
                <StatCard title="Total Cost" value="$15.42" change="+8%" icon={<DollarSign className="h-5 w-5" />} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard title="Success Rate" value="94%" change="+2%" icon={<CheckCircle className="h-5 w-5" />} color="text-orange-600" bg="bg-orange-50" />
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
                                <LineChart data={volumeData}>
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
                                <AreaChart data={costData}>
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

                {/* Peak Hours (Heatmap proxy) */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Peak Activity Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={heatmapData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tickFormatter={(val) => `${val}:00`} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
