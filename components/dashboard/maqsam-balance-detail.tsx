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

    const stats = useMemo(() => {
        if (!calls || calls.length === 0) return { inbound: 0, outbound: 0, total: 0, cost: 0 };

        const filtered = calls.filter((call: any) => {
            const isMaqsam = call.source === 'maqsam';
            const phoneStr = String(call.phone || call.customer_number || "");
            const isUAE = phoneStr.startsWith('+971') || phoneStr.startsWith('971');
            return isMaqsam || isUAE;
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
    }, [calls]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-50 p-8 rounded-xl border border-slate-100 shadow-inner">
                <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-cyan-100 rounded-full text-cyan-700 shadow-sm">
                        <Wallet className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Telephony Spend (USD)</p>
                        <p className="text-5xl font-black text-slate-900 tracking-tighter">
                            ${(stats.cost || 0).toFixed(3)}
                        </p>
                    </div>
                </div>
            </div>

            {loadingCalls && (
                <p className="text-center text-xs text-slate-400 animate-pulse">Syncing lifetime logs...</p>
            )}
        </div>
    );
}
