"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Send, Inbox, LayoutDashboard, RefreshCw, BarChart2 } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { consolidateLeads } from "@/lib/leads-utils";
import { useRouter } from "next/navigation";

export default function EmailDashboardPage() {
    const router = useRouter();
    const [selectedLoopMetric, setSelectedLoopMetric] = useState("intro");
    const [dateSubtitle, setDateSubtitle] = useState("all time");

    const [dateRange, setDateRange] = useState<any>(undefined);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalEmails: 0,
        firstEmail: 0,
        responseRate: "0%",
        totalReplies: 0,
        introCounts: [0, 0, 0],       // Email 1-3
        followUpCounts: [0, 0, 0],    // Email 4-6
        nurtureCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0], // Email 7-15
        loopTotals: {
            intro: 0,
            followup: 0,
            nurture: 0
        }
    });

    useEffect(() => {
        const calculateStats = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const rawData = await res.json();
                const allLeads = consolidateLeads(rawData);

                // Apply Date Filtering if dateRange is set
                const leads = allLeads.filter((lead: any) => {
                    if (!dateRange?.from) return true;
                    if (!lead.created_at) return false;

                    const leadDate = new Date(lead.created_at);
                    const from = new Date(dateRange.from);
                    from.setHours(0, 0, 0, 0);
                    const to = dateRange.to ? new Date(dateRange.to) : from;
                    to.setHours(23, 59, 59, 999);

                    return leadDate >= from && leadDate <= to;
                });

                let totalEmails = 0;
                let replyCount = 0;

                const intro = [0, 0, 0];
                const followUp = [0, 0, 0];
                const nurture = [0, 0, 0, 0, 0, 0, 0, 0, 0];

                leads.forEach((lead: any) => {
                    const stages = lead.stages_passed || [];

                    // Count Stages
                    stages.forEach((stage: string) => {
                        const s = stage.toLowerCase();
                        if (s.includes("email")) {
                            totalEmails++;

                            // Map to arrays
                            // Intro
                            if (s.includes("email 1") && !s.includes("10") && !s.includes("11") && !s.includes("12") && !s.includes("13") && !s.includes("14") && !s.includes("15")) intro[0]++;
                            if (s.includes("email 2")) intro[1]++;
                            if (s.includes("email 3")) intro[2]++;

                            // Follow Up
                            if (s.includes("email 4")) followUp[0]++;
                            if (s.includes("email 5")) followUp[1]++;
                            if (s.includes("email 6")) followUp[2]++;

                            // Nurture
                            if (s.includes("email 7")) nurture[0]++;
                            if (s.includes("email 8")) nurture[1]++;
                            if (s.includes("email 9")) nurture[2]++;
                            if (s.includes("email 10")) nurture[3]++;
                            if (s.includes("email 11")) nurture[4]++;
                            if (s.includes("email 12")) nurture[5]++;
                            if (s.includes("email 13")) nurture[6]++;
                            if (s.includes("email 14")) nurture[7]++;
                            if (s.includes("email 15")) nurture[8]++;
                        }
                    });

                    if (lead.replied && lead.replied !== "No") {
                        replyCount++;
                    }
                });

                setData({
                    totalEmails: totalEmails,
                    firstEmail: intro[0],
                    responseRate: leads.length > 0 ? ((replyCount / leads.length) * 100).toFixed(1) + "%" : "0%",
                    totalReplies: replyCount,
                    introCounts: intro,
                    followUpCounts: followUp,
                    nurtureCounts: nurture,
                    loopTotals: {
                        intro: intro.reduce((a, b) => a + b, 0),
                        followup: followUp.reduce((a, b) => a + b, 0),
                        nurture: nurture.reduce((a, b) => a + b, 0)
                    }
                });

            } catch (e) {
                console.error("Dashboard fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        calculateStats();
    }, [dateRange]); // Recalculate when dateRange changes

    const handleDateUpdate = (range: any) => {
        setDateRange(range.range);
        if (range.label) {
            setDateSubtitle(range.label.toLowerCase() === "today" ? "sent today" : `sent ${range.label.toLowerCase()}`);
        } else {
            setDateSubtitle("sent in selected range");
        }
    };

    // Derived Data for Metric Card
    const loopMetricData = {
        intro: { value: data.loopTotals.intro, label: "Intro Loop Emails", iconColor: "text-blue-600", bgColor: "bg-blue-50" },
        followup: { value: data.loopTotals.followup, label: "Follow Up Loop Emails", iconColor: "text-amber-600", bgColor: "bg-amber-50" },
        nurture: { value: data.loopTotals.nurture, label: "Nurture Loop Emails", iconColor: "text-purple-600", bgColor: "bg-purple-50" },
    };
    const currentMetric = loopMetricData[selectedLoopMetric as keyof typeof loopMetricData];

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
                    onClick={() => router.push('/dashboard/email/sent')}
                />
                <MetricCard
                    title="First Email (Intro)"
                    subtitle={dateSubtitle}
                    value={data.firstEmail}
                    icon={<Send className="h-6 w-6 text-blue-600" />}
                    bg="bg-blue-50"
                />

                {/* Dynamic Loop Card */}
                <Card className="border-slate-200 hover:shadow-md transition-all cursor-pointer bg-white">
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-2">
                            <Select value={selectedLoopMetric} onValueChange={setSelectedLoopMetric}>
                                <SelectTrigger className="w-[140px] h-8 text-xs font-medium border-slate-200">
                                    <SelectValue placeholder="Select Loop" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="intro">Intro Loop</SelectItem>
                                    <SelectItem value="followup">Follow Up Loop</SelectItem>
                                    <SelectItem value="nurture">Nurture Loop</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className={`p-2 rounded-xl ${currentMetric.bgColor}`}>
                                <LayoutDashboard className={`h-5 w-5 ${currentMetric.iconColor}`} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">{currentMetric.value}</h3>
                            <p className="text-xs text-slate-500">{currentMetric.label}</p>
                        </div>
                    </CardContent>
                </Card>

                <MetricCard
                    title="Total Replies"
                    subtitle="All time"
                    value={data.totalReplies}
                    icon={<Inbox className="h-6 w-6 text-sky-600" />}
                    bg="bg-sky-50"
                    onClick={() => router.push('/dashboard/email/received')}
                />
            </div>

            {/* Campaign Breakdown with Tabs */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Campaign Performance</h2>
                </div>

                <Tabs defaultValue="intro" className="w-full">
                    <div className="flex justify-start mb-6">
                        <TabsList className="bg-slate-100 p-1 rounded-lg">
                            <TabsTrigger value="intro" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Intro Loop</TabsTrigger>
                            <TabsTrigger value="followup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Follow Up Loop</TabsTrigger>
                            <TabsTrigger value="nurture" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Nurture Loop</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="intro" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {["Email 1", "Email 2", "Email 3"].map((name, i) => (
                                <BreakdownCard
                                    key={name}
                                    title={name}
                                    count={data.introCounts[i]}
                                    total={data.totalEmails}
                                    color="#3b82f6"
                                    trackColor="#eff6ff"
                                />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="followup" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {["Email 4", "Email 5", "Email 6"].map((name, i) => (
                                <BreakdownCard
                                    key={name}
                                    title={name}
                                    count={data.followUpCounts[i]}
                                    total={data.totalEmails}
                                    color="#f59e0b"
                                    trackColor="#fffbeb"
                                />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="nurture" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            {/* User asked for 9 cards. Grid 3x3 is good. */}
                            {Array.from({ length: 9 }).map((_, i) => (
                                <BreakdownCard
                                    key={`nurture-${i}`}
                                    title={`Email ${i + 7}`}
                                    count={data.nurtureCounts[i]}
                                    total={data.totalEmails}
                                    color="#8b5cf6"
                                    trackColor="#f3e8ff"
                                />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function MetricCard({ title, subtitle, value, icon, bg, onClick }: any) {
    return (
        <Card
            className="border-slate-200 hover:shadow-md transition-all cursor-pointer bg-white"
            onClick={onClick}
        >
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

function BreakdownCard({ title, count, total, color, trackColor }: any) {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
    const chartData = [{ value: parseFloat(percentage) }, { value: 100 - parseFloat(percentage) }];

    return (
        <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="h-32 w-full mb-2 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
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
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-lg font-bold text-slate-900">{percentage}%</span>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-1">{count}</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
                <p className="text-xs text-slate-400 mt-1">Emails Sent</p>
            </CardContent>
        </Card>
    );
}
