"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, DollarSign, CheckCircle, Search, Loader2, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { calculateDuration, formatDuration } from "@/lib/utils";
import { LMLoader } from "@/components/lm-loader";
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
import { format, parseISO, startOfDay, subDays } from "date-fns";
import { useData } from "@/context/DataContext";

export default function VoiceAnalyticsPage() {
    const { calls: globalCalls, loadingCalls, voiceBalance, leads: globalLeads, loadingLeads } = useData();
    const [statusFilter, setStatusFilter] = useState("all");
    const [providerFilter, setProviderFilter] = useState("vapi");
    const [calls, setCalls] = useState<any[]>([]);
    const [loadingLocal, setLoadingLocal] = useState(false);
    const loading = loadingLocal || loadingCalls;
    const [dateRange, setDateRange] = useState<any>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });




    // Processed Data States
    const [volumeData, setVolumeData] = useState<any[]>([]);
    const [durationData, setDurationData] = useState<any[]>([]);
    const [costData, setCostData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalCalls: 0,
        avgDuration: 0,
        totalCost: 0,
        successRate: 0,
        typesData: [],
        characterCount: 0,
        characterLimit: 0,
        vapiBalance: 0,
        inboundDuration: 0,
        outboundDuration: 0,
        pickupRate: 0,
        completionRate: 0,
        positiveRate: 0,
        positiveCount: 0,
        qualifiedCount: 0,
        connectedCount: 0,
    });

    useEffect(() => {
        if (voiceBalance) {
            setStats(prev => ({
                ...prev,
                characterCount: voiceBalance.elevenlabs?.character_count || voiceBalance.character_count || 0,
                characterLimit: voiceBalance.elevenlabs?.character_limit || voiceBalance.character_limit || 0,
                vapiBalance: voiceBalance.vapi?.balance || 0
            }));
        }
    }, [voiceBalance]);

    useEffect(() => {
        if (loadingCalls) return;

        // Filter by date range if set
        const filteredCalls = globalCalls.filter((call: any) => {
            if (providerFilter !== "all" && call.source !== providerFilter) return false;

            if (!dateRange?.from) return true;

            // Normalize startedAt for filtering
            const dateStr = call.startedAt || (call.start_time_unix_secs ? new Date(call.start_time_unix_secs * 1000).toISOString() : null);
            if (!dateStr) return false;

            const callDate = new Date(dateStr);
            const from = startOfDay(new Date(dateRange.from));
            const to = startOfDay(new Date(dateRange.to || dateRange.from));
            to.setHours(23, 59, 59, 999);

            return callDate >= from && callDate <= to;
        });

        setCalls(filteredCalls);
        processAnalytics(filteredCalls);
    }, [globalCalls, loadingCalls, globalLeads, loadingLeads, dateRange, providerFilter]);

    const processAnalytics = (data: any[]) => {
        const totalCalls = data.length;
        let totalDuration = 0;
        let totalCredits = 0;
        let successCount = 0;

        const dayMap = new Map();
        const durationBuckets = { '0-30s': 0, '30s-1m': 0, '1m-2m': 0, '2m-5m': 0, '5m+': 0 };
        const typesMap = new Map();

        let inboundSum = 0;
        let outboundSum = 0;

        let connectedCount = 0;
        let qualifiedCount = 0;
        let positiveCount = 0;
        let intentDetectedCount = 0;

        // Lifetime calculations (all time)
        let lifetimeVapiUsedSum = 0;
        let lifetimeELUsedSum = 0;
        globalCalls.forEach(call => {
            let cost = 0;
            if (typeof call.cost === 'string') {
                cost = parseFloat(call.cost.replace(/[^\d.]/g, '')) || 0;
            } else if (typeof call.cost === 'number') {
                cost = call.cost;
            }

            if (call.source === 'vapi') {
                // Specifically sum the agent/Vapi portion for credits metric
                lifetimeVapiUsedSum += (call.breakdown?.agent !== undefined) ? call.breakdown.agent : cost;
            }
            if (call.source === 'elevenlabs') lifetimeELUsedSum += cost;
        });

        data.forEach(call => {
            const dateStr = call.startedAt || null;
            const time = dateStr ? format(new Date(dateStr), 'MMM dd') : 'N/A';
            const dur = calculateDuration(call);

            let cost = 0;
            if (typeof call.cost === 'string') {
                cost = parseFloat(call.cost.replace(/[^\d.]/g, '')) || 0;
            } else if (typeof call.cost === 'number') {
                cost = call.cost;
            }

            if (call.status === 'done' || call.status === 'ended' || call.status === 'completed' || call.status === 'success' || call.status === 'answered') {
                successCount++;
            }

            totalDuration += dur;
            totalCredits += cost;

            const raw = call.raw || call;
            const directionProp = (raw.telephony?.direction || raw.direction || "").toLowerCase();
            const isInbound = call.isInbound === true || directionProp.includes('inbound') || directionProp.includes('incoming');
            const isWebCall = (typeof call.type === 'string' && call.type.toLowerCase() === 'web call') || (call.phone === 'Website/API');

            if (isInbound) {
                inboundSum += dur;
            } else {
                outboundSum += dur;
            }

            const typeLabel = isInbound ? 'Inbound' : (isWebCall ? 'Web Call' : 'Outbound');
            typesMap.set(typeLabel, (typesMap.get(typeLabel) || 0) + 1);

            const dayObj = dayMap.get(time) || { calls: 0, credits: 0 };
            dayMap.set(time, {
                calls: dayObj.calls + 1,
                credits: dayObj.credits + cost
            });

            if (dur < 30) durationBuckets['0-30s']++;
            else if (dur < 60) durationBuckets['30s-1m']++;
            else if (dur < 120) durationBuckets['1m-2m']++;
            else if (dur < 300) durationBuckets['2m-5m']++;
            else durationBuckets['5m+']++;

            // ── Funnel Metrics Calculation ──────────────────────────────────
            // 1. PICK-UP RATE: call was answered (duration > 18s AND terminal status)
            const isConnected = dur > 18 && (
                call.status === 'done' || call.status === 'ended' ||
                call.status === 'completed' || call.status === 'answered' || call.status === 'success'
            );
            if (isConnected) connectedCount++;

            if (isConnected) {
                // 2. COMPLETION RATE: count calls where Assistant or Customer ended the call
                const reason = (call.endedReason || "").toLowerCase();
                const status = (call.status || "").toLowerCase();
                
                // Vapi Reasons vs ElevenLabs Reasons vs Status-based fallback
                const isCompleted = 
                    // Vapi
                    reason.includes("assistant-ended-call") || reason.includes("customer-ended-call") || 
                    reason.includes("assistant ended call") || reason.includes("customer ended call") ||
                    // ElevenLabs
                    reason.includes("end_of_conversation") || reason.includes("user_interrupted") ||
                    // Fallback for ElevenLabs if reason is missing but status is clear
                    (call.source === 'elevenlabs' && (status === 'done' || status === 'completed' || status === 'success'));
                
                if (isCompleted) {
                    qualifiedCount++; 
                }

                // 3. POSITIVE RESPONSE RATE: count based on specific positive lead statuses
                // 3. POSITIVE RESPONSE RATE: count based on specific positive lead statuses
                const leadStatus = (call.leadStatus || "").trim().toLowerCase();
                const isPositive = leadStatus.includes("interest") || leadStatus.includes("postpone");
                if (isPositive) {
                    // This count is still kept for any per-call analytics if needed
                }
            }
        }); // end data.forEach

        // 3. GLOBAL POSITIVE RESPONSE RATE: Sum from ALL leads (Overall sum)
        // User requested to remove date filtering for this metric
        const leadsToCount = globalLeads;

        const countPositives = (list: any[]) => {
            let count = 0;
            list.forEach(l => {
                const status = (l.lead_status || l["Lead Status"] || "").trim();
                
                // Strictly ONLY these two exact strings (based on request)
                const isMatch = status === "Expression Of Interest" || 
                               status === "Callback- Plan Postponed";
                
                if (isMatch) {
                    count++;
                }
            });
            return count;
        };

        let globalPositiveCount = countPositives(leadsToCount);
        console.log(`[Analytics] Total leads scanned: ${globalLeads.length}, Global Positive Sum: ${globalPositiveCount}`);
        
        setStats(prev => ({
            ...prev,
            totalCalls,
            avgDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
            totalCost: totalCredits,
            successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0,
            typesData: Array.from(typesMap.entries()) as any,
            inboundDuration: inboundSum,
            outboundDuration: outboundSum,
            lifetimeVapiUsed: (voiceBalance?.vapi?.used !== undefined && voiceBalance?.vapi?.used !== 0) ? voiceBalance.vapi.used : lifetimeVapiUsedSum,
            lifetimeELUsed: lifetimeELUsedSum,
            pickupRate: totalCalls > 0 ? (connectedCount / totalCalls) * 100 : 0,
            completionRate: totalCalls > 0 ? (qualifiedCount / totalCalls) * 100 : 0,
            positiveRate: totalCalls > 0 ? (globalPositiveCount / totalCalls) * 100 : 0,
            positiveCount: globalPositiveCount,
            qualifiedCount,
            connectedCount
        }));

        const sortedDays = Array.from(dayMap.entries()).sort((a, b) => {
            const dateA = new Date(`${a[0]} ${new Date().getFullYear()}`).getTime();
            const dateB = new Date(`${b[0]} ${new Date().getFullYear()}`).getTime();
            return dateA - dateB;
        });

        setVolumeData(sortedDays.map(([name, obj]) => ({ name, value: obj.calls })));
        setDurationData(Object.entries(durationBuckets).map(([name, value]) => ({ name, value })));
        setCostData(sortedDays.map(([name, obj]) => ({ name, value: obj.credits })));
    };

    return (
        <div className="space-y-8 pb-10 relative min-h-[500px]">
            {loading && <LMLoader />}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Voice Analytics</h1>
                    <p className="text-slate-500">Comprehensive insights into voice agent performance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Provider" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Providers</SelectItem>
                            <SelectItem value="vapi">Vapi</SelectItem>
                            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                        </SelectContent>
                    </Select>
                    <DateRangePicker onUpdate={(values) => setDateRange(values.range)} />
                </div>
            </div>

            {/* Key Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="Total Calls" value={stats.totalCalls} change="Historical" icon={<Phone className="h-5 w-5" />} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="Total Call Duration" value={formatDuration(stats.inboundDuration + stats.outboundDuration)} change="All Inbound + Outbound" icon={<Clock className="h-5 w-5" />} color="text-cyan-600" bg="bg-cyan-50" />
                <StatCard title="Avg Duration" value={`${Math.round(stats.avgDuration)}s`} change="All Time" icon={<Clock className="h-5 w-5" />} color="text-purple-600" bg="bg-purple-50" />
                <StatCard
                    title="ElevenLabs Left"
                    value={(stats.characterLimit - stats.characterCount).toLocaleString()}
                    change={`of ${stats.characterLimit.toLocaleString()} cap`}
                    icon={<DollarSign className="h-5 w-5" />}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    title="Vapi Credits Used"
                    value={`$${(stats as any).lifetimeVapiUsed?.toFixed(2) || '0.00'}`}
                    change="All Time Count"
                    icon={<DollarSign className="h-5 w-5" />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
            </div>

            {/* AI Voice Call Funnel Analytics */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="p-1.5 bg-blue-600 rounded-lg"><PhoneIncoming className="h-4 w-4 text-white" /></span>
                    AI Voice Call Funnel Analytics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard 
                        title="Call Pick-up Rate" 
                        value={`${stats.pickupRate.toFixed(1)}%`} 
                        change="Connected vs Total" 
                        icon={<Phone className="h-5 w-5" />} 
                        color="text-indigo-600" 
                        bg="bg-indigo-50" 
                    />
                    <StatCard 
                        title="Call Completion Rate" 
                        value={`${stats.completionRate.toFixed(1)}%`} 
                        change="Qualified vs Total" 
                        icon={<CheckCircle className="h-5 w-5" />} 
                        color="text-emerald-600" 
                        bg="bg-emerald-50" 
                    />
                    <StatCard 
                        title="Positive Response Rate" 
                        value={`${stats.positiveRate.toFixed(1)}%`} 
                        change="Positive vs Total" 
                        icon={<CheckCircle className="h-5 w-5" />} 
                        color="text-orange-600" 
                        bg="bg-orange-50" 
                    />
                </div>
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

                {/* Cost Analysis -> Credits Usage */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Credits Usage</CardTitle>
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
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => [`${value} credits`, 'Used']} />
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
                            <CardTitle className="text-lg">Call Sources Volume</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Channel Type</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* @ts-ignore */}
                                    {(stats.typesData || []).map((typeTuple: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{typeTuple[0]}</TableCell>
                                            <TableCell className="text-right font-bold">{typeTuple[1]}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(!stats.typesData || stats.typesData.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-4 text-slate-500">No data available for this range</TableCell>
                                        </TableRow>
                                    )}
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
