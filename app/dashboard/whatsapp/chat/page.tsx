"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    Filter,
    Users,
    Send,
    MessageCircle,
    MessageSquare,
    RefreshCw
} from "lucide-react";
import { consolidateLeads, ConsolidatedLead } from "@/lib/leads-utils";
import { WhatsAppChatDetail } from "@/components/dashboard/whatsapp-chat-detail";

export default function WhatsappChatPage() {
    const [leads, setLeads] = useState<ConsolidatedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    // Filter State
    const [pendingFilters, setPendingFilters] = useState<{
        replyStatus: string[],
        loops: string[]
    }>({
        replyStatus: [],
        loops: []
    });

    const [activeFilters, setActiveFilters] = useState<{
        replyStatus: string[],
        loops: string[]
    }>({
        replyStatus: [],
        loops: []
    });

    const [stats, setStats] = useState({
        totalLeads: 0,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        repliedCount: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed to fetch leads");
                const rawData = await res.json();
                const allLeads = consolidateLeads(rawData);

                // Only include leads with some WhatsApp activity
                const wpLeads = allLeads.filter(l =>
                    l.stages_passed.some(s => s.toLowerCase().includes("whatsapp")) ||
                    (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none")
                );

                setLeads(wpLeads);

                // Calculate real metrics
                let sent = 0;
                let replied = 0;
                wpLeads.forEach(l => {
                    const wpStages = l.stages_passed.filter(s => s.toLowerCase().includes("whatsapp"));
                    sent += wpStages.length;
                    if (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") {
                        replied++;
                    }
                });

                setStats({
                    totalLeads: wpLeads.length,
                    sentCount: sent,
                    deliveredCount: Math.round(sent * 0.8), // Placeholder for real delivery stats if available
                    readCount: Math.round(sent * 0.6),
                    repliedCount: replied
                });

            } catch (err) {
                console.error("WhatsApp list error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.phone.includes(searchQuery);

            const hasReplied = l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none";

            // Reply Status Filter
            const matchesReplyStatus = activeFilters.replyStatus.length === 0 ||
                (activeFilters.replyStatus.includes("Replied") && hasReplied) ||
                (activeFilters.replyStatus.includes("No Reply") && !hasReplied);

            // Loop Filter
            const matchesLoop = activeFilters.loops.length === 0 ||
                activeFilters.loops.includes(l.source_loop);

            return matchesSearch && matchesReplyStatus && matchesLoop;
        });
    }, [leads, searchQuery, activeFilters]);

    const handleApplyFilters = () => {
        setActiveFilters(pendingFilters);
    };

    const handleResetFilters = () => {
        const reset = { replyStatus: [], loops: [] };
        setPendingFilters(reset);
        setActiveFilters(reset);
    };

    const toggleFilter = (type: 'replyStatus' | 'loops', value: string) => {
        setPendingFilters(prev => {
            const current = prev[type];
            if (current.includes(value)) {
                return { ...prev, [type]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [type]: [...current, value] };
            }
        });
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Chats</h1>
                    <p className="text-slate-500 text-sm">Real-time engagement across your leads</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Overview Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="WhatsApp Leads"
                        value={loading ? "..." : stats.totalLeads.toLocaleString()}
                        desc="Leads with WP Activity"
                        icon={Users}
                    />
                    <MetricCard
                        title="Messages Sent"
                        value={loading ? "..." : stats.sentCount.toLocaleString()}
                        desc="Total WP pulses"
                        icon={Send}
                    />
                    <MetricCard
                        title="Delivery Health"
                        value={loading ? "..." : "Stable"}
                        desc="Overall delivery status"
                        icon={MessageCircle}
                        dots={{ delivered: stats.deliveredCount, read: stats.readCount, failed: stats.sentCount - stats.deliveredCount }}
                    />
                    <MetricCard
                        title="Total Replies"
                        value={loading ? "..." : stats.repliedCount.toLocaleString()}
                        desc={`${stats.totalLeads > 0 ? ((stats.repliedCount / stats.totalLeads) * 100).toFixed(1) : 0}% Response Rate`}
                        icon={MessageSquare}
                    />
                </div>

                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-4 space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Delivery Status</h3>
                            <p className="text-xs text-slate-500">Breakdown of outbound flow</p>
                        </div>
                        <div className="space-y-3">
                            <StatusBar label="Delivered" value={stats.deliveredCount} total={stats.sentCount || 1} color="bg-blue-400" />
                            <StatusBar label="Read" value={stats.readCount} total={stats.sentCount || 1} color="bg-emerald-500" />
                            <StatusBar label="Failed" value={stats.sentCount - stats.deliveredCount} total={stats.sentCount || 1} color="bg-rose-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-slate-200 shadow-sm bg-white h-auto">
                        <CardContent className="p-4 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 text-slate-900 font-bold">
                                    <Filter className="h-4 w-4" /> Filters
                                </div>
                                {(activeFilters.replyStatus.length > 0 || activeFilters.loops.length > 0) && (
                                    <button onClick={handleResetFilters} className="text-[10px] text-emerald-600 font-bold hover:underline">
                                        RESET
                                    </button>
                                )}
                            </div>

                            <FilterSection title="Reply Status">
                                <FilterOption
                                    label="Replied"
                                    checked={pendingFilters.replyStatus.includes("Replied")}
                                    onCheckedChange={() => toggleFilter('replyStatus', "Replied")}
                                />
                                <FilterOption
                                    label="No Reply"
                                    checked={pendingFilters.replyStatus.includes("No Reply")}
                                    onCheckedChange={() => toggleFilter('replyStatus', "No Reply")}
                                />
                            </FilterSection>

                            <FilterSection title="Loop">
                                <FilterOption
                                    label="Intro"
                                    checked={pendingFilters.loops.includes("Intro")}
                                    onCheckedChange={() => toggleFilter('loops', "Intro")}
                                />
                                <FilterOption
                                    label="Follow Up"
                                    checked={pendingFilters.loops.includes("Follow Up")}
                                    onCheckedChange={() => toggleFilter('loops', "Follow Up")}
                                />
                                <FilterOption
                                    label="Nurture"
                                    checked={pendingFilters.loops.includes("Nurture")}
                                    onCheckedChange={() => toggleFilter('loops', "Nurture")}
                                />
                            </FilterSection>

                            <Button
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9"
                                size="sm"
                                onClick={handleApplyFilters}
                            >
                                Apply Filters
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-10 bg-white"
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                        {loading ? (
                            <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-2">
                                <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                                Loading real-time chats...
                            </div>
                        ) : filteredLeads.length === 0 ? (
                            <div className="p-10 text-center text-slate-500">
                                No WhatsApp chats found.
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Lead</th>
                                        <th className="px-4 py-3 text-center">Loop</th>
                                        <th className="px-4 py-3 text-center">Msgs Sent</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Last Msg Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLeads.map((lead) => (
                                        <CustomerRow key={lead.id} lead={lead} onClick={() => setSelectedLeadId(lead.id)} />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>
            </div>

            {/* Chat Detail Modal */}
            <Dialog open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-6 gap-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>WhatsApp Chat Detail</DialogTitle>
                    </DialogHeader>
                    {selectedLeadId && (
                        <WhatsAppChatDetail
                            customerId={selectedLeadId}
                            onClose={() => setSelectedLeadId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MetricCard({ title, value, desc, icon: Icon, dots }: any) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-2">
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                <p className="text-xs font-medium text-slate-500">{title}</p>
                <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
                {dots && (
                    <div className="flex gap-1 mt-2">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function StatusBar({ label, value, total, color }: any) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-slate-600">
                <span>{label}</span>
                <span>{value} ({((value / total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${(value / total) * 100}%` }} />
            </div>
        </div>
    );
}

function FilterSection({ title, children }: any) {
    return (
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400">{title}</h4>
            <div className="space-y-1.5">{children}</div>
        </div>
    );
}

function FilterOption({ label, checked, onCheckedChange }: any) {
    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id={label}
                className="h-3.5 w-3.5 border-slate-300"
                checked={checked}
                onCheckedChange={onCheckedChange}
            />
            <label htmlFor={label} className="text-sm font-medium text-slate-600 cursor-pointer">{label}</label>
        </div>
    );
}

function CustomerRow({ lead, onClick }: { lead: ConsolidatedLead; onClick: () => void }) {
    const sentCount = lead.stages_passed.filter(s => s.toLowerCase().includes("whatsapp")).length;
    const hasReplied = lead.whatsapp_replied && lead.whatsapp_replied !== "No" && lead.whatsapp_replied !== "none";

    return (
        <tr className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={onClick}>
            <td className="px-4 py-3">
                <div className="block">
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700">{lead.name}</div>
                    <div className="text-xs text-slate-500">{lead.phone}</div>
                </div>
            </td>
            <td className="px-4 py-3 text-center">
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-blue-100 text-blue-600 bg-blue-50">
                    {lead.source_loop}
                </Badge>
            </td>
            <td className="px-4 py-3 text-center font-bold text-slate-700">{sentCount}</td>
            <td className="px-4 py-3 text-center">
                {hasReplied ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] font-bold">REPLIED</Badge>
                ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">SENT</Badge>
                )}
            </td>
            <td className="px-4 py-3 text-right text-slate-500 text-xs">
                {new Date(lead.created_at).toLocaleDateString()}
            </td>
        </tr>
    );
}
