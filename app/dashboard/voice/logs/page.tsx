"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Play, ChevronLeft, ChevronRight, User, Loader2, Download, ExternalLink, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import React, { useState, useEffect } from "react";
import { CallDetailsModal } from "@/components/voice/call-details-modal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, parseISO } from "date-fns";
import { calculateDuration, formatDuration } from "@/lib/utils";

// Progressively fetches deep call details for purely visible rows since ElevenLabs List API censors `type`/`direction` properties and deeper numeric variables
const DynamicRowCells = ({ call }: { call: any }) => {
    const [realType, setRealType] = useState(call.type);
    const [guestNum, setGuestNum] = useState(call.guestNumber);

    useEffect(() => {
        // If we lack deep metadata and might need to pull hidden types or numbers
        if (!call.raw?.metadata && (call.type === 'Outbound' || guestNum === '+Website/API' || guestNum === 'Website/API' || guestNum === 'Unknown')) {
            fetch(`/api/calls/${call.id}`).then(res => res.json()).then(data => {
                const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables || {};
                const deepType = data.type || data.metadata?.type || dynamicVars.direction || dynamicVars.type || "unknown";

                const deepIsInbound = deepType === 'inbound';
                if (deepIsInbound) {
                    setRealType("Inbound");
                }

                // Deep extract phone
                const callerNumber = data.phone || data.caller_number || data.metadata?.caller_number || dynamicVars.caller_number || dynamicVars.caller || "Unknown";
                const calleeNumber = data.callee_number || data.metadata?.callee_number || dynamicVars.callee_number || dynamicVars.callee || "Unknown";
                const centralNumber = "97148714150";

                let newGuestNum = "Unknown";
                if (deepIsInbound) {
                    newGuestNum = callerNumber;
                } else {
                    newGuestNum = calleeNumber !== "Unknown" && calleeNumber !== centralNumber ? calleeNumber : callerNumber;
                }

                if (newGuestNum !== "Unknown" && newGuestNum !== "Website/API") {
                    setGuestNum(`+${newGuestNum.replace(/\+/g, '')}`);
                } else if (newGuestNum === "Website/API") {
                    setGuestNum("Website/API");
                } else {
                    setGuestNum(newGuestNum);
                }

                // Keep the row's raw data enriched for the Modal on click
                call.raw = data;
            }).catch(() => { });
        }
    }, [call.id, call.type, guestNum, call.raw?.metadata]);

    const displayGuestNum = guestNum === "+Website/API" ? "Website/API" : guestNum;

    return (
        <>
            <TableCell className="font-medium text-slate-700">{displayGuestNum}</TableCell>
            <TableCell>
                <span className={`font-semibold ${realType === 'Inbound' ? 'text-blue-600' : 'text-slate-700'}`}>
                    {realType}
                </span>
            </TableCell>
        </>
    );
};

export default function VoiceLogsPage() {
    const [allCalls, setAllCalls] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState<any>(undefined);
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [phoneFilter, setPhoneFilter] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchAllCalls = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/calls');
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();

            // Map ElevenLabs/Vapi data to our table structure
            const mappedCalls = data.map((call: any) => {
                const id = call.id;
                const startedAt = call.startedAt;
                const durationVal = call.durationSeconds || 0;

                const rawDynamicVars = call.conversation_initiation_client_data?.dynamic_variables || {};
                const rawType = call.type || call.metadata?.type || rawDynamicVars.direction || rawDynamicVars.type || "unknown";
                const isInbound = rawType === 'inbound';
                const typeLabel = isInbound ? "Inbound" : "Outbound";

                let callerNumber = call.phone || call.caller_number || call.metadata?.caller_number || rawDynamicVars.caller_number || rawDynamicVars.caller || "Unknown";
                let calleeNumber = call.callee_number || call.metadata?.callee_number || rawDynamicVars.callee_number || rawDynamicVars.callee || "Unknown";
                const centralNumber = "97148714150";

                let guestNumber = "Unknown";
                if (isInbound) {
                    guestNumber = callerNumber;
                } else {
                    guestNumber = calleeNumber !== "Unknown" && calleeNumber !== centralNumber ? calleeNumber : callerNumber;
                }

                let finalGuestNum = "Unknown";
                if (guestNumber !== "Unknown" && guestNumber !== "Website/API") {
                    finalGuestNum = `+${guestNumber.replace(/\+/g, '')}`;
                } else if (guestNumber === "Website/API") {
                    finalGuestNum = "Website/API";
                }

                return {
                    id: id,
                    status: call.status,
                    type: typeLabel,
                    startedAt: startedAt,
                    guestNumber: finalGuestNum,
                    duration: formatDuration(durationVal),
                    date: startedAt ? new Date(startedAt).toLocaleString() : 'N/A',
                    raw: call
                };
            });

            setAllCalls(mappedCalls);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllCalls();
    }, []);

    useEffect(() => {
        // Filter locally
        const filteredCalls = allCalls.filter((call: any) => {
            if (dateRange?.from) {
                if (!call.startedAt) return false;
                const callDate = new Date(call.startedAt);
                const from = new Date(dateRange.from);
                from.setHours(0, 0, 0, 0);
                const to = dateRange.to ? new Date(dateRange.to) : from;
                to.setHours(23, 59, 59, 999);
                if (callDate < from || callDate > to) return false;
            }

            if (statusFilter !== "all" && call.status !== statusFilter) return false;
            if (typeFilter !== "all" && call.type.toLowerCase() !== typeFilter.toLowerCase()) return false;

            if (phoneFilter) {
                const searchStr = phoneFilter.replace(/\+/g, '').replace(/\s+/g, '');
                const rawGuestNum = call.guestNumber ? call.guestNumber.replace(/\+/g, '').replace(/\s+/g, '') : "Unknown";
                if (!rawGuestNum.includes(searchStr)) return false;
            }

            return true;
        });

        // Sort by date desc
        setCalls(filteredCalls.sort((a: any, b: any) => new Date(b.raw.startedAt).getTime() - new Date(a.raw.startedAt).getTime()));
        setCurrentPage(1);
    }, [allCalls, dateRange, statusFilter, typeFilter, phoneFilter]);

    const handleRefresh = () => {
        fetchAllCalls();
    };

    const handleRowClick = (call: any) => {
        setSelectedCall(call.raw); // Pass raw Vapi object to modal if compatible, or map it
        setModalOpen(true);
    };

    // Calculate paginated calls
    const paginatedCalls = calls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
                        <p className="text-slate-500">View and manage your voice agent call history.</p>
                    </div>
                    <div className="flex items-center gap-3">
                    <DateRangePicker onUpdate={(values) => setDateRange(values.range)} />
                        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Dashboard
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative w-[220px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search phone number..."
                            className="pl-9 h-9"
                            value={phoneFilter}
                            onChange={(e) => setPhoneFilter(e.target.value)}
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Call Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="inbound">Inbound</SelectItem>
                            <SelectItem value="outbound">Outbound</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="done">Done / Completed</SelectItem>
                            <SelectItem value="failed">Failed / Error</SelectItem>
                        </SelectContent>
                    </Select>
                    
                </div>
            </div>

            {/* Table */}
            <Card className="border-slate-200 overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableHead className="font-bold text-slate-700 w-[150px]">Execution ID</TableHead>
                                <TableHead className="font-bold text-slate-700">Phone Number (Guest)</TableHead>
                                <TableHead className="font-bold text-slate-700">Type</TableHead>
                                <TableHead className="font-bold text-slate-700">Status</TableHead>
                                <TableHead className="font-bold text-slate-700">Duration</TableHead>
                                <TableHead className="font-bold text-slate-700 w-[200px]">Date & Time</TableHead>
                                <TableHead className="font-bold text-slate-700 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Loading calls...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedCalls.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                        No calls found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCalls.map((call) => (
                                    <TableRow
                                        key={call.id}
                                        className="cursor-pointer hover:bg-slate-50 transition-colors group"
                                        onClick={() => handleRowClick(call)}
                                    >
                                        <TableCell className="font-mono text-xs text-slate-500">{call.id?.substring(0, 8)}...</TableCell>
                                        <DynamicRowCells call={call} />
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`font-medium ${call.status === 'done' || call.status === 'completed' || call.status === 'success'
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                    } uppercase text-[10px] px-2.5 py-0.5`}
                                            >
                                                {call.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">{call.duration}</TableCell>
                                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">{call.date}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRowClick(call);
                                                }}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-bold text-slate-900">{calls.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, calls.length)}</span> of {calls.length} calls
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-sm">
                            Page {currentPage}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(calls.length / itemsPerPage), p + 1))}
                            disabled={currentPage >= Math.ceil(calls.length / itemsPerPage)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            <CallDetailsModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                call={selectedCall}
            />
        </div>
    );
}
