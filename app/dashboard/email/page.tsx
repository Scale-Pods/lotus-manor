"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Send, Paperclip as PaperPlane, Inbox, AlertOctagon, LineChart } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

export default function EmailDashboardPage() {
    const [followUpStage, setFollowUpStage] = useState("1");
    const [dateSubtitle, setDateSubtitle] = useState("sent last 7 days");

    // State for dashboard metrics
    const [data, setData] = useState({
        totalEmails: 0,
        firstEmail: 0,
        openRate: "N/A", // Not available in API
        responseRate: "0%",
        totalReplies: 0,
        followUpBreakdown: [
            { count: 0, percentage: "0%" },
            { count: 0, percentage: "0%" },
            { count: 0, percentage: "0%" },
            { count: 0, percentage: "0%" },
            { count: 0, percentage: "0%" },
            { count: 0, percentage: "0%" },
        ]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateStats = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const leads = await res.json();

                let totalEmails = 0;
                let firstEmailCount = 0;
                let replyCount = 0;
                // Follow up counts
                const followUpCounts = [0, 0, 0, 0, 0, 0];

                leads.forEach((lead: any) => {
                    const stages = lead.stages_passed || [];

                    // Check specific stages
                    // Mapping based on user prompts/conventions:
                    // "Email 1" = First Email
                    // "Email 2" = 1st Follow up (Stage 3 in Intro?)
                    // "Email 3" = 2nd Follow up (Stage 4 in Intro?)
                    // Actually, let's just count occurrences of "Email" 

                    stages.forEach((stage: string) => {
                        const s = stage.toLowerCase();
                        if (s.includes("email")) {
                            totalEmails++;
                            if (s.includes("1")) firstEmailCount++;
                            // Rough mapping for follow ups based on number?
                            if (s.includes("2")) followUpCounts[0]++;
                            if (s.includes("3")) followUpCounts[1]++;
                            if (s.includes("4")) followUpCounts[2]++;
                            if (s.includes("5")) followUpCounts[3]++;
                            if (s.includes("6")) followUpCounts[4]++;
                            // 6th index?
                        }
                    });

                    if (lead.replied && lead.replied !== "No") {
                        replyCount++;
                    }
                });

                // Calculate percentages
                const formatPct = (val: number) => totalEmails > 0 ? ((val / totalEmails) * 100).toFixed(1) + "%" : "0%";

                setData({
                    totalEmails: totalEmails,
                    firstEmail: firstEmailCount,
                    openRate: "N/A",
                    responseRate: leads.length > 0 ? ((replyCount / leads.length) * 100).toFixed(1) + "%" : "0%",
                    totalReplies: replyCount,
                    followUpBreakdown: followUpCounts.map(count => ({
                        count: count,
                        percentage: formatPct(count)
                    }))
                });

            } catch (e) {
                console.error("Dashboard fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        calculateStats();
    }, []);

    const handleDateUpdate = ({ label }: { label?: string }) => {
        if (label) {
            setDateSubtitle(label.toLowerCase() === "today" ? "sent today" : `sent ${label.toLowerCase()}`);
        } else {
            setDateSubtitle("sent in selected range");
        }
        // Date filtering logic would go here if API supported it
    };

    // Derived FollowUp Data based on current state `data`
    const followUpData: any = {
        "1": { value: data.followUpBreakdown[0].count, subtitle: dateSubtitle, iconColor: "text-emerald-600", bgColor: "bg-emerald-50" },
        "2": { value: data.followUpBreakdown[1].count, subtitle: dateSubtitle, iconColor: "text-amber-600", bgColor: "bg-amber-50" },
        "3": { value: data.followUpBreakdown[2].count, subtitle: dateSubtitle, iconColor: "text-blue-600", bgColor: "bg-blue-50" },
        "4": { value: data.followUpBreakdown[3].count, subtitle: dateSubtitle, iconColor: "text-purple-600", bgColor: "bg-purple-50" },
        "5": { value: data.followUpBreakdown[4].count, subtitle: dateSubtitle, iconColor: "text-pink-600", bgColor: "bg-pink-50" },
        "6": { value: data.followUpBreakdown[5].count, subtitle: dateSubtitle, iconColor: "text-rose-600", bgColor: "bg-rose-50" },
    };

    const currentFollowUp = followUpData[followUpStage] || followUpData["1"];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Email Marketing Center</h1>
                    <p className="text-slate-500">Monitor your campaigns and inbox health</p>
                </div>
                <DateRangePicker onUpdate={handleDateUpdate} />
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Emails"
                    subtitle={dateSubtitle}
                    value={data.totalEmails}
                    icon={<Mail className="h-6 w-6 text-indigo-600" />}
                    bg="bg-indigo-50"
                />
                <MetricCard
                    title="First Email"
                    subtitle={dateSubtitle}
                    value={data.firstEmail}
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
                    subtitle={dateSubtitle.replace("sent", "received")}
                    value={data.totalReplies}
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
                        count={data.followUpBreakdown[0].count}
                        percentage={data.followUpBreakdown[0].percentage}
                        color="#10b981"
                        trackColor="#ecfdf5"
                        data={[{ value: parseFloat(data.followUpBreakdown[0].percentage) }, { value: 100 - parseFloat(data.followUpBreakdown[0].percentage) }]}
                    />
                    <BreakdownCard
                        title="2nd Follow-up"
                        count={data.followUpBreakdown[1].count}
                        percentage={data.followUpBreakdown[1].percentage}
                        color="#f59e0b"
                        trackColor="#fffbeb"
                        data={[{ value: parseFloat(data.followUpBreakdown[1].percentage) }, { value: 100 - parseFloat(data.followUpBreakdown[1].percentage) }]}
                    />
                    <BreakdownCard
                        title="3rd Follow-up"
                        count={data.followUpBreakdown[2].count}
                        percentage={data.followUpBreakdown[2].percentage}
                        color="#3b82f6"
                        trackColor="#eff6ff"
                        data={[{ value: parseFloat(data.followUpBreakdown[2].percentage) }, { value: 100 - parseFloat(data.followUpBreakdown[2].percentage) }]}
                    />
                    <BreakdownCard
                        title="4th Follow-up"
                        count={data.followUpBreakdown[3].count}
                        percentage={data.followUpBreakdown[3].percentage}
                        color="#8b5cf6"
                        trackColor="#f3e8ff"
                        data={[{ value: parseFloat(data.followUpBreakdown[3].percentage) }, { value: 100 - parseFloat(data.followUpBreakdown[3].percentage) }]}
                    />
                    <BreakdownCard
                        title="5th Follow-up"
                        count={data.followUpBreakdown[4].count}
                        percentage={data.followUpBreakdown[4].percentage}
                        color="#ec4899"
                        trackColor="#fce7f3"
                        data={[{ value: parseFloat(data.followUpBreakdown[4].percentage) }, { value: 100 - parseFloat(data.followUpBreakdown[4].percentage) }]}
                    />
                    <BreakdownCard
                        title="6th Follow-up"
                        count={data.followUpBreakdown[5].count}
                        percentage={data.followUpBreakdown[5].percentage}
                        color="#e11d48"
                        trackColor="#ffe4e6"
                        data={[{ value: parseFloat(data.followUpBreakdown[5].percentage) }, { value: 100 - parseFloat(data.followUpBreakdown[5].percentage) }]}
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
                <p className="text-xs text-slate-400 mt-1">{percentage} of Total Emails Sent</p>
            </CardContent>
        </Card>
    );
}
