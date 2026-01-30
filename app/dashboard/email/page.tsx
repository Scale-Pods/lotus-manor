"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Send, Paperclip as PaperPlane, Inbox, AlertOctagon, LineChart } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function EmailDashboardPage() {
    const [followUpStage, setFollowUpStage] = useState("1");

    // Mock data for different stages
    const followUpData: any = {
        "1": { value: "703", subtitle: "sent today", iconColor: "text-emerald-600", bgColor: "bg-emerald-50" },
        "2": { value: "431", subtitle: "sent today", iconColor: "text-amber-600", bgColor: "bg-amber-50" },
        "3": { value: "215", subtitle: "sent today", iconColor: "text-blue-600", bgColor: "bg-blue-50" },
        "4": { value: "98", subtitle: "sent today", iconColor: "text-purple-600", bgColor: "bg-purple-50" },
        "5": { value: "45", subtitle: "sent today", iconColor: "text-pink-600", bgColor: "bg-pink-50" },
        "6": { value: "12", subtitle: "sent today", iconColor: "text-rose-600", bgColor: "bg-rose-50" },
    };

    const currentFollowUp = followUpData[followUpStage];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Email Marketing Center</h1>
                    <p className="text-slate-500">Monitor your campaigns and inbox health</p>
                </div>
                <DateRangePicker />
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
                    title="First Email"
                    subtitle="sent today"
                    value="1,747"
                    icon={<Send className="h-6 w-6 text-blue-600" />}
                    bg="bg-blue-50"
                />

                {/* Dynamic Follow-up Card */}
                <Card className="border-slate-200 hover:shadow-md transition-all cursor-pointer bg-white">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-2">
                            <Select value={followUpStage} onValueChange={setFollowUpStage}>
                                <SelectTrigger className="w-[140px] h-8 text-xs font-medium border-slate-200">
                                    <SelectValue placeholder="Select Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1st Follow-up</SelectItem>
                                    <SelectItem value="2">2nd Follow-up</SelectItem>
                                    <SelectItem value="3">3rd Follow-up</SelectItem>
                                    <SelectItem value="4">4th Follow-up</SelectItem>
                                    <SelectItem value="5">5th Follow-up</SelectItem>
                                    <SelectItem value="6">6th Follow-up</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className={`p-2 rounded-xl ${currentFollowUp.bgColor}`}>
                                <Mail className={`h-5 w-5 ${currentFollowUp.iconColor}`} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">{currentFollowUp.value}</h3>
                            <p className="text-xs text-slate-500">{currentFollowUp.subtitle}</p>
                        </div>
                    </CardContent>
                </Card>

                <MetricCard
                    title="Total Replies"
                    subtitle="received today"
                    value="124"
                    icon={<Inbox className="h-6 w-6 text-sky-600" />}
                    bg="bg-sky-50"
                />
            </div>

            {/* Follow-up Campaigns Breakdown */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Follow-up Campaigns</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <BreakdownCard
                        title="3rd Follow-up"
                        count="215"
                        percentage="7%"
                        color="#3b82f6"
                        trackColor="#eff6ff"
                        data={[{ value: 7 }, { value: 93 }]}
                    />
                    <BreakdownCard
                        title="4th Follow-up"
                        count="98"
                        percentage="3%"
                        color="#8b5cf6"
                        trackColor="#f3e8ff"
                        data={[{ value: 3 }, { value: 97 }]}
                    />
                    <BreakdownCard
                        title="5th Follow-up"
                        count="45"
                        percentage="1.5%"
                        color="#ec4899"
                        trackColor="#fce7f3"
                        data={[{ value: 1.5 }, { value: 98.5 }]}
                    />
                    <BreakdownCard
                        title="6th Follow-up"
                        count="12"
                        percentage="0.4%"
                        color="#e11d48"
                        trackColor="#ffe4e6"
                        data={[{ value: 0.4 }, { value: 99.6 }]}
                    />
                </div>
            </div>

            {/* Email Type Breakdown (Original - Optional, keeping for now or removing if redundant? 
                The user asked to "show more than 2nd follow ups... below in that also show all 6 cards".
                I will replace the old breakdown section with this new one as it seems to be what was requested.) */}
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
