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
    const [currentPage, setCurrentPage] = useState(1);
    const leadsPerPage = 4;

    // Filter State
    const [pendingFilters, setPendingFilters] = useState<{
        replyStatus: string[],
        loops: string[],
        messageStatus: string[]
    }>({
        replyStatus: [],
        loops: [],
        messageStatus: []
    });

    const [activeFilters, setActiveFilters] = useState<{
        replyStatus: string[],
        loops: string[],
        messageStatus: string[]
    }>({
        replyStatus: [],
        loops: [],
        messageStatus: []
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
                const wpLeads = allLeads.filter(l => {
                    // 1. Check legacy stages
                    if (l.stages_passed.some(s => s.toLowerCase().includes("whatsapp"))) return true;

                    // 2. Check legacy replied field
                    if (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") return true;

                    // 3. Check extended history (Replied 1-10)
                    for (let i = 1; i <= 10; i++) {
                        const r = l[`W.P_Replied_${i}`];
                        if (r && String(r).toLowerCase() !== "no" && String(r).toLowerCase() !== "none") return true;
                    }

                    // 4. Check extended history (FollowUp 1-10)
                    for (let i = 1; i <= 10; i++) {
                        if (l[`W.P_FollowUp_${i}`]) return true;
                    }

                    return false;
                });

                setLeads(wpLeads);

                // Calculate real metrics
                let totalSent = 0;
                let repliedCount = 0;

                wpLeads.forEach(l => {
                    // Count all outgoing W.P_1-6
                    let leadSent = 0;
                    for (let i = 1; i <= 6; i++) {
                        if (l[`W.P_${i}`] || l.stage_data?.[`WhatsApp ${i}`]) leadSent++;
                    }

                    // Count legacy FollowUp
                    if (l["W.P_FollowUp"] || l.stage_data?.["WhatsApp FollowUp"]) leadSent++;

                    // Count extended FollowUp 1-10
                    for (let i = 1; i <= 10; i++) {
                        if (l[`W.P_FollowUp_${i}`]) leadSent++;
                    }

                    totalSent += leadSent;

                    // Check for ANY reply
                    let hasReplied = false;
                    if (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") {
                        hasReplied = true;
                    } else {
                        // Check extended replies
                        for (let i = 1; i <= 10; i++) {
                            const r = l[`W.P_Replied_${i}`];
                            if (r && String(r).toLowerCase() !== "no" && String(r).toLowerCase() !== "none") {
                                hasReplied = true;
                                break;
                            }
                        }
                    }

                    if (hasReplied) repliedCount++;
                });

                setStats({
                    totalLeads: wpLeads.length,
                    sentCount: totalSent,
                    deliveredCount: Math.round(totalSent * 0.96),
                    readCount: Math.round(totalSent * 0.82),
                    repliedCount: repliedCount
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

            // Check for ANY reply
            let hasReplied = false;
            if (l.whatsapp_replied && l.whatsapp_replied !== "No" && l.whatsapp_replied !== "none") {
                hasReplied = true;
            } else {
                for (let i = 1; i <= 10; i++) {
                    const r = l[`W.P_Replied_${i}`];
                    if (r && String(r).toLowerCase() !== "no" && String(r).toLowerCase() !== "none") {
                        hasReplied = true;
                        break;
                    }
                }
            }

            // Reply Status Filter
            const matchesReplyStatus = activeFilters.replyStatus.length === 0 ||
                (activeFilters.replyStatus.includes("Replied") && hasReplied) ||
                (activeFilters.replyStatus.includes("No Reply") && !hasReplied);

            // Loop Filter
            const matchesLoop = activeFilters.loops.length === 0 ||
                activeFilters.loops.includes(l.source_loop);

            // Message Status Filter
            const matchesMessageStatus = activeFilters.messageStatus.length === 0 ||
                activeFilters.messageStatus.some(status => {
                    const s1 = (l["W.P_1 TS"] || "").toLowerCase();
                    const s2 = (l["W.P_2 TS"] || "").toLowerCase();
                    const target = status.toLowerCase();
                    return s1.includes(target) || s2.includes(target);
                });

            return matchesSearch && matchesReplyStatus && matchesLoop && matchesMessageStatus;
        });
    }, [leads, searchQuery, activeFilters]);

    const handleApplyFilters = () => {
        setActiveFilters(pendingFilters);
    };

    const handleResetFilters = () => {
        const reset = { replyStatus: [], loops: [], messageStatus: [] };
        setPendingFilters(reset);
        setActiveFilters(reset);
    };

    const toggleFilter = (type: 'replyStatus' | 'loops' | 'messageStatus', value: string) => {
        setPendingFilters(prev => {
            const current = prev[type];
            if (current.includes(value)) {
                return { ...prev, [type]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [type]: [...current, value] };
            }
        });
    };

    // Pagination Logic
    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * leadsPerPage;
        return filteredLeads.slice(start, start + leadsPerPage);
    }, [filteredLeads, currentPage]);

    const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeFilters]);

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

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar: Filters */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-slate-200 shadow-sm bg-white h-auto">
                        <CardContent className="p-4 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 text-slate-900 font-bold">
                                    <Filter className="h-4 w-4" /> Filters
                                </div>
                                {(activeFilters.replyStatus.length > 0 || activeFilters.loops.length > 0 || activeFilters.messageStatus.length > 0) && (
                                    <button onClick={handleResetFilters} className="text-[10px] text-emerald-600 font-bold hover:underline">
                                        RESET
                                    </button>
                                )}
                            </div>

                            <FilterSection title="Reply Status" >
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

                            <FilterSection title="Message Status">
                                <FilterOption
                                    label="Read"
                                    checked={pendingFilters.messageStatus.includes("Read")}
                                    onCheckedChange={() => toggleFilter('messageStatus', "Read")}
                                />
                                <FilterOption
                                    label="Sent"
                                    checked={pendingFilters.messageStatus.includes("Sent")}
                                    onCheckedChange={() => toggleFilter('messageStatus', "Sent")}
                                />
                                <FilterOption
                                    label="Failed"
                                    checked={pendingFilters.messageStatus.includes("Failed")}
                                    onCheckedChange={() => toggleFilter('messageStatus', "Failed")}
                                />
                                <FilterOption
                                    label="Delivered"
                                    checked={pendingFilters.messageStatus.includes("Delivered")}
                                    onCheckedChange={() => toggleFilter('messageStatus', "Delivered")}
                                />
                                <FilterOption
                                    label="Deleted"
                                    checked={pendingFilters.messageStatus.includes("Deleted")}
                                    onCheckedChange={() => toggleFilter('messageStatus', "Deleted")}
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

                {/* Main Content: Metrics and Table */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Overview Metrics (Remaining) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <MetricCard
                                title="Messages Sent"
                                value={loading ? "..." : stats.sentCount.toLocaleString()}
                                desc="Total outgoing pulses"
                                icon={Send}
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
                                    <p className="text-xs text-slate-500">Global outbound health</p>
                                </div>
                                <div className="space-y-3">
                                    <StatusBar label="Sent" value={stats.sentCount} total={stats.sentCount || 1} color="bg-blue-400" />
                                    <StatusBar label="Replied" value={stats.repliedCount} total={stats.sentCount || 1} color="bg-emerald-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

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
                                        <th className="px-4 py-3 text-center">Messages Sent</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Message Status</th>
                                        <th className="px-4 py-3 text-right">Last Message Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedLeads.map((lead) => (
                                        <CustomerRow key={lead.id} lead={lead} onClick={() => setSelectedLeadId(lead.id)} />
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Pagination Controls */}
                        {!loading && filteredLeads.length > 0 && (
                            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-medium">
                                    Showing <span className="text-slate-900 font-bold">{filteredLeads.length > 0 ? (currentPage - 1) * leadsPerPage + 1 : 0}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * leadsPerPage, filteredLeads.length)}</span> of <span className="text-slate-900 font-bold">{filteredLeads.length}</span> leads
                                </div>
                                {filteredLeads.length > leadsPerPage && (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[10px] font-bold uppercase tracking-wider"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                        >
                                            Prev
                                        </Button>
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Button
                                                key={i}
                                                variant={currentPage === i + 1 ? "default" : "outline"}
                                                size="sm"
                                                className={`h-8 w-8 text-xs font-bold ${currentPage === i + 1 ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                                                onClick={() => setCurrentPage(i + 1)}
                                            >
                                                {i + 1}
                                            </Button>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[10px] font-bold uppercase tracking-wider"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </div>
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
    // 1. Calculate Sent Count (Outgoing)
    let sentCount = 0;
    for (let i = 1; i <= 6; i++) {
        if (lead[`W.P_${i}`] || lead.stage_data?.[`WhatsApp ${i}`]) sentCount++;
    }
    if (lead["W.P_FollowUp"] || lead.stage_data?.["WhatsApp FollowUp"]) sentCount++;

    // Calculate extended sent count (FollowUp 1-10)
    for (let i = 1; i <= 10; i++) {
        if (lead[`W.P_FollowUp_${i}`]) sentCount++;
    }

    // Check for ANY reply
    let hasReplied = false;
    if (lead.whatsapp_replied && lead.whatsapp_replied !== "No" && lead.whatsapp_replied !== "none") {
        hasReplied = true;
    } else {
        // Check extended replies
        for (let i = 1; i <= 10; i++) {
            const r = lead[`W.P_Replied_${i}`];
            if (r && String(r).toLowerCase() !== "no" && String(r).toLowerCase() !== "none") {
                hasReplied = true;
                break;
            }
        }
    }

    // 2. Find Last Message Date
    const getMsgDate = (raw: any) => {
        if (!raw || !String(raw).trim()) return null;
        const content = String(raw).trim();
        const isoRegex = /\n\n(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+)$/;
        const isoMatch = content.match(isoRegex);
        if (isoMatch) return new Date(isoMatch[1]);

        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1].trim();
        const lastLineDate = new Date(lastLine.replace(' ', 'T'));
        if (lines.length > 1 && !isNaN(lastLineDate.getTime()) && lastLine.includes('-') && lastLine.includes(':')) {
            return lastLineDate;
        }
        return null;
    };

    let latestDate = new Date(lead.created_at);

    // Check all bot messages
    for (let i = 1; i <= 6; i++) {
        const d = getMsgDate(lead[`W.P_${i}`] || lead.stage_data?.[`WhatsApp ${i}`]);
        if (d && d > latestDate) latestDate = d;
    }
    // Check reply
    const rd = getMsgDate(lead.whatsapp_replied || lead.stage_data?.["WhatsApp Replied"]);
    if (rd && rd > latestDate) latestDate = rd;
    // Check followup
    const fd = getMsgDate(lead["W.P_FollowUp"] || lead.stage_data?.["WhatsApp FollowUp"]);
    if (fd && fd > latestDate) latestDate = fd;

    // Check extended history
    for (let i = 1; i <= 10; i++) {
        const dReplied = getMsgDate(lead[`W.P_Replied_${i}`]);
        if (dReplied && dReplied > latestDate) latestDate = dReplied;

        const dFollow = getMsgDate(lead[`W.P_FollowUp_${i}`]);
        if (dFollow && dFollow > latestDate) latestDate = dFollow;
    }

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
            <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1.5">
                    {lead["W.P_1 TS"] && <MessageStatusBadge index={1} status={lead["W.P_1 TS"]} />}
                    {lead["W.P_2 TS"] && <MessageStatusBadge index={2} status={lead["W.P_2 TS"]} />}
                </div>
            </td>
            <td className="px-4 py-3 text-right text-slate-500 text-xs">
                {latestDate.toLocaleDateString()}
            </td>
        </tr>
    );
}

function MessageStatusBadge({ index, status }: { index: number, status: string }) {
    if (!status) return null;

    // Format status text (capitalize)
    const formatted = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // Determine color
    let badgeClass = "bg-slate-100 text-slate-600 border-slate-200"; // default/sent
    if (formatted.includes("Delivered")) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (formatted.includes("Read")) badgeClass = "bg-blue-50 text-blue-700 border-blue-100";
    if (formatted.includes("Failed")) badgeClass = "bg-red-50 text-red-700 border-red-100";

    return (
        <div className="flex items-center gap-1.5 w-full justify-center">
            <span className="text-[9px] text-slate-300 font-mono select-none">{index}</span>
            <Badge variant="outline" className={`h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                {formatted}
            </Badge>
        </div>
    );
}
