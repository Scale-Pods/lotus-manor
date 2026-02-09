"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Play, ChevronLeft, ChevronRight, User, Loader2, Download, ExternalLink } from "lucide-react";
import React, { useState, useEffect } from "react";
import { CallDetailsModal } from "@/components/voice/call-details-modal";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format, parseISO } from "date-fns";
import { calculateDuration, formatDuration } from "@/lib/utils";

export default function VoiceLogsPage() {
    const [allCalls, setAllCalls] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState<any>(undefined);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const fetchAllCalls = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/calls');
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();

            // Map Vapi data to our table structure ONCE
            const mappedCalls = data.map((call: any) => ({
                id: call.id,
                status: call.status,
                startedAt: call.startedAt,
                endedAt: call.endedAt,
                duration: formatDuration(calculateDuration(call)),
                cost: call.cost ? `$${call.cost.toFixed(2)}` : '$0.00',
                date: call.startedAt ? new Date(call.startedAt).toLocaleString() : 'N/A',
                raw: call
            }));

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
            if (!dateRange?.from) return true;
            if (!call.startedAt) return false;
            const callDate = new Date(call.startedAt);
            // Simple date comparison - need to ensure we compare correctly (e.g. start of day)
            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : from;
            to.setHours(23, 59, 59, 999);

            return callDate >= from && callDate <= to;
        });

        // Sort by date desc
        setCalls(filteredCalls.sort((a: any, b: any) => new Date(b.raw.startedAt).getTime() - new Date(a.raw.startedAt).getTime()));
        setCurrentPage(1);
    }, [allCalls, dateRange]);

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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
                    <p className="text-slate-500">View and manage your voice agent call history.</p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker onUpdate={(values) => setDateRange(values.range)} />
                    <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="border-slate-200 overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableHead className="font-bold text-slate-700 w-[200px]">Execution ID</TableHead>
                                <TableHead className="font-bold text-slate-700">Status</TableHead>
                                <TableHead className="font-bold text-slate-700">Duration</TableHead>
                                <TableHead className="font-bold text-slate-700">Cost</TableHead>
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
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`font-medium ${call.status === 'ended' || call.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                    } uppercase text-[10px] px-2.5 py-0.5`}
                                            >
                                                {call.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">{call.duration}</TableCell>
                                        <TableCell className="font-medium text-slate-700">{call.cost}</TableCell>
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
