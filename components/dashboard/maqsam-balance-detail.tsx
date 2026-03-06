"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, PhoneIncoming, PhoneOutgoing, Wallet } from "lucide-react";
import { calculateDuration, formatDuration } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";

export function MaqsamBalanceDetail({ initialBalance }: { initialBalance?: any }) {
    const { calls, loadingCalls } = useData();
    const [dateRange, setDateRange] = useState<any>({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
    });

    const stats = useMemo(() => {
        if (!calls || calls.length === 0) return { inbound: 0, outbound: 0, total: 0, cost: 0 };

        const filtered = calls.filter((call: any) => {
            if (!dateRange?.from) return true;
            const startedAt = call.startedAt || (call.start_time_unix_secs ? call.start_time_unix_secs * 1000 : null);
            if (!startedAt) return false;

            const callDate = new Date(startedAt);
            const from = startOfDay(dateRange.from);
            const to = endOfDay(dateRange.to || dateRange.from);
            return callDate >= from && callDate <= to;
        });

        let inbound = 0;
        let outbound = 0;

        filtered.forEach((call: any) => {
            const duration = calculateDuration(call);
            const centralNumber = "97148714150";

            // HYPER-AGGRESSIVE Inbound Detection
            const raw = call.raw || call;
            const metadata = raw.metadata || {};
            const dv = raw.conversation_initiation_client_data?.dynamic_variables || {};
            const telephony = raw.telephony || {};
            const initType = (raw.conversation_initiation_type || "").toLowerCase();
            const directionProp = (telephony.direction || raw.direction || metadata.direction || dv.direction || raw.type || "").toLowerCase();

            const isInbound =
                call.isInbound === true ||
                (typeof call.type === 'string' && (call.type.toLowerCase() === "inbound" || call.type === "Inbound")) ||
                directionProp.includes('inbound') ||
                directionProp.includes('incoming') ||
                initType.includes('inbound') ||
                initType.includes('incoming') ||
                (call.calleeNumber && call.calleeNumber.toString().replace(/\D/g, '').includes(centralNumber));

            if (isInbound) {
                inbound += duration;
            } else {
                // Outbound includes both telephony-outbound AND Web Calls
                outbound += duration;
            }
        });

        const total = inbound + outbound;
        const cost = (total / 60) * 0.16;

        return { inbound, outbound, total, cost };
    }, [calls, dateRange]);

    const handleDateUpdate = ({ range }: { range: any }) => {
        setDateRange(range);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg text-cyan-700">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Calculated Consumption</p>
                        <p className="text-2xl font-bold text-slate-900">
                            ${(stats.cost || 0).toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker onUpdate={handleDateUpdate} />
                </div>
            </div>

            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold text-center">Total Inbound + Outbound Duration</TableHead>
                            <TableHead className="font-bold text-center">
                                <div className="flex items-center justify-center gap-1">
                                    Total Calculated Cost
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3.5 w-3.5 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] p-3 text-xs leading-relaxed">
                                                <p className="font-bold mb-1">Calculation Method:</p>
                                                <p>Total Duration across all calls × $0.16 per minute</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="text-center text-lg font-medium text-slate-700">
                                <div className="flex flex-col items-center gap-1">
                                    <PhoneIncoming className="h-4 w-4 text-cyan-500 mb-1" />
                                    {formatDuration(stats.total) || "0m 0s"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="text-2xl font-bold text-cyan-700">
                                    ${(stats.cost || 0).toFixed(2)}
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            {loadingCalls && (
                <p className="text-center text-xs text-slate-400 animate-pulse">Recalculating real-time consumption data...</p>
            )}
        </div>
    );
}
