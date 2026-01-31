"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TrendingUp, Users, MessageSquare, Send } from "lucide-react";

const data = [
    { name: 'Mon', sent: 400, read: 240, replied: 10 },
    { name: 'Tue', sent: 300, read: 139, replied: 15 },
    { name: 'Wed', sent: 500, read: 380, replied: 25 },
    { name: 'Thu', sent: 280, read: 190, replied: 20 },
    { name: 'Fri', sent: 590, read: 430, replied: 35 },
    { name: 'Sat', sent: 320, read: 210, replied: 15 },
    { name: 'Sun', sent: 450, read: 320, replied: 28 },
];

export default function WhatsappAnalyticsPage() {
    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Analytics</h1>
                    <p className="text-slate-500 text-sm">Detailed performance metrics for your WhatsApp channel</p>
                </div>
                <DateRangePicker onUpdate={(range) => console.log("WhatsApp Analytics Date Update:", range)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard title="Total Sent" value="12,450" change="+12%" icon={<Send className="h-5 w-5" />} color="text-blue-600" bg="bg-blue-50" />
                <MetricCard title="Read Rate" value="68%" change="+5%" icon={<Users className="h-5 w-5" />} color="text-emerald-600" bg="bg-emerald-50" />
                <MetricCard title="Reply Rate" value="4.2%" change="+1.5%" icon={<MessageSquare className="h-5 w-5" />} color="text-purple-600" bg="bg-purple-50" />
                <MetricCard title="Conversion" value="2.8%" change="+0.4%" icon={<TrendingUp className="h-5 w-5" />} color="text-orange-600" bg="bg-orange-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Engagement Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="read" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Response Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="replied" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, change, icon, color, bg }: any) {
    return (
        <Card className="border-slate-200">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
                    <p className="text-xs text-emerald-600 font-bold mt-1">{change} vs last mo</p>
                </div>
                <div className={`p-4 rounded-xl ${bg} ${color}`}>{icon}</div>
            </CardContent>
        </Card>
    );
}
