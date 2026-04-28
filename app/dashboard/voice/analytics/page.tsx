"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, DollarSign, CheckCircle, PhoneIncoming, Crown } from "lucide-react";
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
import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { useData } from "@/context/DataContext";

export default function VoiceAnalyticsPage() {
    const { calls: globalCalls, loadingCalls, voiceBalance, leads: globalLeads, loadingLeads, refreshCalls } = useData();
    const [statusFilter, setStatusFilter] = useState("all");
    // accountFilter: 'vapi' | 'vapi-owners' | 'vapi-normal' | 'elevenlabs'
    const [accountFilter, setAccountFilter] = useState("vapi");
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
        normalCalls: 0,
        ownersCalls: 0,
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

    // Server-side refresh when filters/date change
    useEffect(() => {
        if (!dateRange?.from) return;
        const includeElevenLabs = accountFilter === 'elevenlabs';
        const provider = accountFilter === 'elevenlabs' ? 'elevenlabs' : 'vapi';
        refreshCalls({
            from: dateRange.from,
            to: dateRange.to || dateRange.from,
            includeElevenLabs,
            provider
        });
    }, [dateRange, accountFilter, refreshCalls]);

    useEffect(() => {
        // Show data instantly if it exists in the global cache from the master dashboard
        if (globalCalls.length === 0 && loadingCalls) return;

        // Apply account/provider filter
        const filteredCalls = globalCalls.filter((call: any) => {
            if (accountFilter === 'vapi') return call.source === 'vapi';
            if (accountFilter === 'vapi-normal') return call.source === 'vapi' && call.vapiAccount === 'normal';
            if (accountFilter === 'vapi-owners') return call.source === 'vapi' && call.vapiAccount === 'owners';
            if (accountFilter === 'elevenlabs') return call.source === 'elevenlabs';
            return true;
        });

        setCalls(filteredCalls);
        processAnalytics(filteredCalls);
    }, [globalCalls, loadingCalls, globalLeads, loadingLeads, accountFilter]);

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
        let normalCallsCount = 0;
        let ownersCallsCount = 0;

        // Lifetime calculations (all global calls)
        let lifetimeVapiUsedSum = 0;
        let lifetimeELUsedSum = 0;
        globalCalls.forEach(call => {
            let cost = 0;
            if (typeof call.cost === 'string') cost = parseFloat(call.cost.replace(/[^\d.]/g, '')) || 0;
            else if (typeof call.cost === 'number') cost = call.cost;
            if (call.source === 'vapi') lifetimeVapiUsedSum += (call.breakdown?.agent !== undefined) ? call.breakdown.agent : cost;
            if (call.source === 'elevenlabs') lifetimeELUsedSum += cost;
            if (call.source === 'vapi' && call.vapiAccount === 'normal') normalCallsCount++;
            if (call.source === 'vapi' && call.vapiAccount === 'owners') ownersCallsCount++;
        });

        data.forEach(call => {
            const dateStr = call.startedAt || null;
            const time = dateStr ? format(new Date(dateStr), 'MMM dd') : 'N/A';
            const dur = calculateDuration(call);

            let cost = 0;
            if (typeof call.cost === 'string') cost = parseFloat(call.cost.replace(/[^\d.]/g, '')) || 0;
            else if (typeof call.cost === 'number') cost = call.cost;

            if (call.status === 'done' || call.status === 'ended' || call.status === 'completed' || call.status === 'success' || call.status === 'answered') {
                successCount++;
            }

            totalDuration += dur;
            totalCredits += cost;

            const raw = call.raw || call;
            const directionProp = (raw.telephony?.direction || raw.direction || "").toLowerCase();
            const isInbound = call.isInbound === true || directionProp.includes('inbound') || directionProp.includes('incoming');
            const isWebCall = (typeof call.type === 'string' && call.type.toLowerCase() === 'web call') || (call.phone === 'Website/API');

            if (isInbound) inboundSum += dur;
            else outboundSum += dur;

            const typeLabel = isInbound ? 'Inbound' : (isWebCall ? 'Web Call' : 'Outbound');
            typesMap.set(typeLabel, (typesMap.get(typeLabel) || 0) + 1);

            const dayObj = dayMap.get(time) || { calls: 0, credits: 0 };
            dayMap.set(time, { calls: dayObj.calls + 1, credits: dayObj.credits + cost });

            if (dur < 30) durationBuckets['0-30s']++;
            else if (dur < 60) durationBuckets['30s-1m']++;
            else if (dur < 120) durationBuckets['1m-2m']++;
            else if (dur < 300) durationBuckets['2m-5m']++;
            else durationBuckets['5m+']++;

            const isConnected = dur > 18 && (
                call.status === 'done' || call.status === 'ended' ||
                call.status === 'completed' || call.status === 'answered' || call.status === 'success'
            );
            if (isConnected) {
                connectedCount++;
                const reason = (call.endedReason || "").toLowerCase();
                const status = (call.status || "").toLowerCase();
                const isCompleted =
                    reason.includes("assistant-ended-call") || reason.includes("customer-ended-call") ||
                    reason.includes("end_of_conversation") || reason.includes("user_interrupted") ||
                    (call.source === 'elevenlabs' && (status === 'done' || status === 'completed' || status === 'success'));
                if (isCompleted) qualifiedCount++;
            }
        });

        // Positive response count from all leads
        const leadsToCount = globalLeads;
        let globalPositiveCount = 0;
        leadsToCount.forEach((l: any) => {
            const status = (l.lead_status || l["Lead Status"] || "").trim();
            if (status === "Expression Of Interest" || status === "Callback- Plan Postponed") {
                globalPositiveCount++;
            }
        });

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
            connectedCount,
            normalCalls: normalCallsCount,
            ownersCalls: ownersCallsCount,
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
                    <p className="text-slate-500">Comprehensive insights across all voice accounts.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={accountFilter} onValueChange={setAccountFilter}>
                        <SelectTrigger className="w-[190px] h-10">
                            <SelectValue placeholder="Account / Provider" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vapi">All Vapi Calls</SelectItem>
                            <SelectItem value="vapi-owners">Owner Leads</SelectItem>
                            <SelectItem value="vapi-normal">Normal Calls</SelectItem>
                            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                        </SelectContent>
                    </Select>
                    <DateRangePicker onUpdate={(values) => setDateRange(values.range)} />
                </div>
            </div>

            {/* Vapi Account Split Banner */}
            {accountFilter === 'vapi' && !loading && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Phone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Normal Calls</p>
                            <p className="text-2xl font-bold text-blue-700">{stats.normalCalls.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-5 py-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Crown className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Owner Leads Calls</p>
                            <p className="text-2xl font-bold text-amber-700">{stats.ownersCalls.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Key Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <StatCard title="Total Calls" value={stats.totalCalls} change="In Range" icon={<Phone className="h-5 w-5" />} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="Total Duration" value={formatDuration(stats.inboundDuration + stats.outboundDuration)} change="All Inbound + Outbound" icon={<Clock className="h-5 w-5" />} color="text-cyan-600" bg="bg-cyan-50" />
                <StatCard title="Avg Duration" value={`${Math.round(stats.avgDuration)}s`} change="Per Call" icon={<Clock className="h-5 w-5" />} color="text-purple-600" bg="bg-purple-50" />
                <StatCard
                    title="Vapi Credits Used"
                    value={`$${(stats as any).lifetimeVapiUsed?.toFixed(2) || '0.00'}`}
                    change="All Time"
                    icon={<DollarSign className="h-5 w-5" />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
            </div>

            {/* AI Voice Call Funnel */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="p-1.5 bg-blue-600 rounded-lg"><PhoneIncoming className="h-4 w-4 text-white" /></span>
                    AI Voice Call Funnel Analytics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Call Pick-up Rate"
                        value={`${stats.pickupRate.toFixed(1)}%`}
                        change="Picked & duration > 18 sec"
                        icon={<Phone className="h-5 w-5" />}
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                    />
                    <StatCard
                        title="Call Completion Rate"
                        value={`${stats.completionRate.toFixed(1)}%`}
                        change="Completed Conversation"
                        icon={<CheckCircle className="h-5 w-5" />}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <StatCard
                        title="Positive Response Rate"
                        value={`${stats.positiveRate.toFixed(1)}%`}
                        change="EOI & Callback"
                        icon={<CheckCircle className="h-5 w-5" />}
                        color="text-orange-600"
                        bg="bg-orange-50"
                    />
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    {icon && <div className={`p-4 rounded-2xl ${bg} ${color}`}>{icon}</div>}
                </div>
            </CardContent>
        </Card>
    );
}
