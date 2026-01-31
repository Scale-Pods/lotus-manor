"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Play, ChevronLeft, ChevronRight, User } from "lucide-react";
import React, { useState } from "react";
import { CallDetailsModal } from "@/components/voice/call-details-modal";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const calls = [
    { id: '2175e2ff...be89ce', status: 'Completed', duration: '1m 58s', cost: '$0.16', date: 'Jan 28, 2026, 12:32 PM' },
    { id: '182b3847...731f91', status: 'Completed', duration: '2m 28s', cost: '$0.21', date: 'Jan 27, 2026, 1:32 PM' },
    { id: 'cec8c812...829e18', status: 'Completed', duration: '1m 44s', cost: '$0.16', date: 'Jan 27, 2026, 9:09 AM' },
    { id: 'a7a88b08...b716a4', status: 'Completed', duration: '1m 48s', cost: '$0.15', date: 'Dec 29, 2025, 8:22 AM' },
    { id: '48a89a6e...978231', status: 'Completed', duration: '1m 47s', cost: '$0.14', date: 'Dec 29, 2025, 8:17 AM' },
    { id: 'f373746e...653fa8', status: 'Completed', duration: '36s', cost: '$0.05', date: 'Dec 29, 2025, 8:16 AM' },
    { id: '2f1ba45f...e261ce', status: 'Completed', duration: '1m 22s', cost: '$0.10', date: 'Dec 29, 2025, 8:13 AM' },
    { id: 'c4bd46b5...579ae4', status: 'Completed', duration: '17s', cost: '$0.04', date: 'Dec 29, 2025, 8:11 AM' },
    { id: '75718089...41b6ca', status: 'Completed', duration: '5s', cost: '$0.02', date: 'Dec 29, 2025, 8:11 AM' },
    { id: 'd372d794...d71b9e', status: 'Completed', duration: '26s', cost: '$0.05', date: 'Dec 29, 2025, 8:03 AM' },
];

export default function VoiceLogsPage() {
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleRowClick = (call: any) => {
        setSelectedCall(call);
        setModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
                    <p className="text-slate-500">History of all voice agent interactions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker onUpdate={(range) => console.log("Voice Logs Date Update:", range)} />
                    <Button variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableHead className="font-bold text-slate-700 w-[200px]">Execution ID</TableHead>
                                <TableHead className="font-bold text-slate-700">Status</TableHead>
                                <TableHead className="font-bold text-slate-700">Duration</TableHead>
                                <TableHead className="font-bold text-slate-700">Cost</TableHead>
                                <TableHead className="font-bold text-slate-700 w-[200px]">Date & Time</TableHead>
                                <TableHead className="font-bold text-slate-700 text-right">Recording</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calls.map((call) => (
                                <TableRow
                                    key={call.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors group"
                                    onClick={() => handleRowClick(call)}
                                >
                                    <TableCell className="font-mono text-xs text-slate-500">{call.id}</TableCell>
                                    <TableCell>
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none shadow-none uppercase text-[10px] px-2.5 py-0.5">
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
                                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRowClick(call);
                                            }}
                                        >
                                            <Play className="h-4 w-4 fill-current" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">1-10</span> of 90 calls</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-sm">
                            Page 1 of 9
                        </span>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
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
