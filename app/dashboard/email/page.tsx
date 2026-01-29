"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Send, Paperclip as PaperPlane, Inbox, AlertOctagon, LineChart } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";

export default function EmailDashboardPage() {
    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Email Marketing Center</h1>
                    <p className="text-slate-500">Monitor your campaigns and inbox health</p>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Emails"
                    subtitle="sent today"
                    value="2,881"
                    icon={<Mail className="h-6 w-6 text-indigo-600" />}
                    bg="bg-indigo-50"
                />
                <MetricCard
                    title="Main Emails"
                    subtitle="sent today"
                    value="1,747"
                    icon={<Send className="h-6 w-6 text-blue-600" />}
                    bg="bg-blue-50"
                />
                <MetricCard
                    title="1st Follow-ups"
                    subtitle="sent today"
                    value="703"
                    icon={<Mail className="h-6 w-6 text-emerald-600" />}
                    bg="bg-emerald-50"
                />
                <MetricCard
                    title="2nd Follow-ups"
                    subtitle="sent today"
                    value="431"
                    icon={<Mail className="h-6 w-6 text-amber-600" />}
                    bg="bg-amber-50"
                />
            </div>

            {/* Email Type Breakdown */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Email Type Breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <BreakdownCard
                        title="Main Emails"
                        count="1747"
                        percentage="61%"
                        color="#2563eb"
                        trackColor="#eff6ff"
                        data={[{ value: 61 }, { value: 39 }]}
                    />
                    <BreakdownCard
                        title="1st Follow-up"
                        count="703"
                        percentage="24%"
                        color="#10b981"
                        trackColor="#ecfdf5"
                        data={[{ value: 24 }, { value: 76 }]}
                    />
                    <BreakdownCard
                        title="2nd Follow-up"
                        count="431"
                        percentage="15%"
                        color="#f59e0b"
                        trackColor="#fffbeb"
                        data={[{ value: 15 }, { value: 85 }]}
                    />
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, subtitle, value, icon, bg }: any) {
    return (
        <Card className="border-slate-200 hover:shadow-md transition-all cursor-pointer bg-white">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${bg}`}>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function BreakdownCard({ title, count, percentage, color, trackColor, data }: any) {
    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-40 w-full mb-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                startAngle={90}
                                endAngle={-270}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell key="cell-0" fill={color} />
                                <Cell key="cell-1" fill={trackColor} />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{percentage}</span>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-1">{count}</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
                <p className="text-xs text-slate-400 mt-1">{percentage} of total</p>
            </CardContent>
        </Card>
    );
}
