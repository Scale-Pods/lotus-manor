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
        let totalCost = 0;

        filtered.forEach((call: any) => {
            const duration = calculateDuration(call);
            const isInbound = call.isInbound === true || (typeof call.type === 'string' && call.type.toLowerCase() === "inbound");

            if (isInbound) {
                inbound += duration;
            } else {
                outbound += duration;
            }
            totalCost += (call.costValue || 0);
        });

        const total = inbound + outbound;

        return { inbound, outbound, total, cost: totalCost };
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
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Total Consumption</p>
                        <p className="text-2xl font-bold text-slate-900">
                            ${(stats.cost || 0).toFixed(3)}
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
                            <TableHead className="font-bold text-center">Total Interaction Duration</TableHead>
                            <TableHead className="font-bold text-center">
                                <div className="flex items-center justify-center gap-1">
                                    Total Spend (USD)
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3.5 w-3.5 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] p-3 text-xs leading-relaxed">
                                                <p className="font-bold mb-1">Advanced Billing Logic:</p>
                                                <p>Outbound calls are computed via high-precision longest-prefix rate matching.( check in Voice Logs Page )</p>
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
                                    <div className="flex items-center gap-2">
                                        <PhoneIncoming className="h-3 w-3 text-cyan-500" />
                                        <span className="text-xs text-slate-400">Inbound + Outbound</span>
                                    </div>
                                    {formatDuration(stats.total) || "0m 0s"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="text-2xl font-bold text-cyan-700">
                                    ${(stats.cost || 0).toFixed(3)}
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            {loadingCalls && (
                <p className="text-center text-xs text-slate-400 animate-pulse">Syncing logs and matching prefix rates...</p>
            )}
        </div>
    );
}
