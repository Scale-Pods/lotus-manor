"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Mail,
    AlertCircle,
    Info,
    Calendar,
    ArrowUp,
    ArrowDown
} from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const bounces = [
    {
        id: 1,
        email: "alex@sourcerie.co",
        senderName: "Adnan Shaikh",
        senderEmail: "adnan@scalepods.org",
        type: "Hard Bounce",
        reason: "Mailbox does not exist",
        code: "550 5.1.1",
        date: "Dec 8, 2025, 04:02 AM",
        subject: "Introduction to Scalepods Marketing",
        body: "Dear Alex,\n\nI hope this email finds you well. I wanted to reach out and introduce you to our new marketing automation platform..."
    },
    {
        id: 2,
        email: "support@techflow.io",
        senderName: "Marketing Team",
        senderEmail: "marketing@scalepods.org",
        type: "Soft Bounce",
        reason: "Mailbox full",
        code: "452 4.2.2",
        date: "Dec 8, 2025, 03:45 AM",
        subject: "Your Weekly Analytics Report",
        body: "Hi Team,\n\nHere is your weekly summary of performance metrics. We noticed a significant uptick in user engagement..."
    },
    {
        id: 3,
        email: "jason.m@construct.ae",
        senderName: "Adnan Shaikh",
        senderEmail: "adnan@scalepods.org",
        type: "Technical Bounce",
        reason: "Connection timed out",
        code: "421 4.4.2",
        date: "Dec 7, 2025, 11:20 PM",
        subject: "Project Update: Phase 2 Kickoff",
        body: "Hello Jason,\n\nRegarding the upcoming phase of the construction project, we have updated the timeline..."
    },
];

export default function BouncedEmailsPage() {
    const [filters, setFilters] = useState({
        campaign: "all",
        type: "all",
        sender: "all"
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        console.log(`Bounce Filter ${key} changed to:`, value);
    };

    return (
        <TooltipProvider>
            <div className="space-y-6 pb-10">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Bounced Emails</h1>
                        <p className="text-slate-500">View all emails that bounced</p>
                    </div>

                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Bounces" value="8" />
                    <StatCard
                        title="Hard Bounces"
                        value="5"
                        color="text-rose-600"
                        tooltip="Permanent failures (e.g., invalid email address). These contacts should be removed immediately."
                    />
                    <StatCard
                        title="Soft Bounces"
                        value="3"
                        color="text-orange-600"
                        tooltip="Temporary failures (e.g., mailbox full). Consistently soft-bouncing emails should eventually be removed."
                    />
                    <StatCard
                        title="Technical Bounces"
                        value="0"
                        color="text-yellow-600"
                        tooltip="Failures due to technical issues (e.g., server timeout). Worth retrying later."
                    />
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input className="pl-10" placeholder="Search by recipient email or sender..." />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                            <Select value={filters.campaign} onValueChange={(val) => handleFilterChange("campaign", val)}>
                                <SelectTrigger className="w-[160px] bg-white text-slate-600">
                                    <SelectValue placeholder="All Campaigns" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Campaigns</SelectItem>
                                    <SelectItem value="q1">Q1 Outreach</SelectItem>
                                    <SelectItem value="newsletter">Newsletter</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filters.type} onValueChange={(val) => handleFilterChange("type", val)}>
                                <SelectTrigger className="w-[160px] bg-white text-slate-600">
                                    <SelectValue placeholder="Bounce Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="hard">Hard Bounce</SelectItem>
                                    <SelectItem value="soft">Soft Bounce</SelectItem>
                                    <SelectItem value="technical">Technical Bounce</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filters.sender} onValueChange={(val) => handleFilterChange("sender", val)}>
                                <SelectTrigger className="w-[160px] bg-white text-slate-600">
                                    <SelectValue placeholder="All Senders" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Senders</SelectItem>
                                    <SelectItem value="adnan">Adnan Shaikh</SelectItem>
                                    <SelectItem value="support">Support Team</SelectItem>
                                </SelectContent>
                            </Select>

                            <DateRangePicker onUpdate={(range) => console.log("Bounced Emails Date Update:", range)} />
                        </div>
                    </div>
                </div>

                {/* Bounced Email List */}
                <div className="space-y-4">
                    {bounces.map((bounce) => (
                        <BounceCard key={bounce.id} bounce={bounce} />
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">Showing 1-10 of 8 bounced emails</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled>Previous</Button>
                        <span className="text-sm font-medium text-slate-600">Page 1 of 1</span>
                        <Button variant="outline" size="sm" disabled>Next</Button>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

function StatCard({ title, value, color, tooltip }: any) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
                    {tooltip && (
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <span className="cursor-pointer">
                                    <Info className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[200px] text-xs">{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <span className={`text-2xl font-bold ${color || 'text-slate-900'}`}>{value}</span>
            </CardContent>
        </Card>
    );
}

function BounceCard({ bounce }: { bounce: any }) {
    const [isOpen, setIsOpen] = useState(false);

    let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
    if (bounce.type === "Hard Bounce") badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
    if (bounce.type === "Soft Bounce") badgeColor = "bg-orange-50 text-orange-700 border-orange-200";
    if (bounce.type === "Technical Bounce") badgeColor = "bg-yellow-50 text-yellow-700 border-yellow-200";

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
            <CollapsibleTrigger asChild>
                <div className="p-4 flex items-center gap-4 cursor-pointer group">
                    <div className="h-10 w-10 shrink-0 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center border border-amber-100">
                        <Mail className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4">
                            <h4 className="font-bold text-slate-900 truncate">{bounce.email}</h4>
                            <p className="text-xs text-slate-500 truncate">From: "{bounce.senderName}" {bounce.senderEmail}</p>
                        </div>
                        <div className="md:col-span-3">
                            <Badge variant="outline" className={`font-bold ${badgeColor} border`}>
                                {bounce.type}
                            </Badge>
                        </div>
                        <div className="md:col-span-5 text-right md:text-right">
                            <span className="text-xs text-slate-400 font-medium">{bounce.date}</span>
                        </div>
                    </div>

                    <div className="shrink-0 p-1 rounded-full text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600 transition-colors">
                        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 border-t border-slate-50 bg-slate-50/30 rounded-b-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                        {/* Original Message */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Message</h4>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-700 space-y-2">
                                <p><span className="font-bold">Subject:</span> {bounce.subject}</p>
                                <div className="pt-2 whitespace-pre-wrap font-sans text-slate-600">
                                    {bounce.body}
                                </div>
                                <div className="pt-4 mt-2 border-t border-slate-100 text-xs text-slate-400">
                                    <p>Warm regards,</p>
                                    <p>{bounce.senderName}</p>
                                    <p>Scalepods</p>
                                </div>
                            </div>
                        </div>

                        {/* Bounce Details */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bounce Details</h4>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                                    <DetailRow label="Bounce Type" value={bounce.type} />
                                    <DetailRow label="Bounce Reason" value={bounce.reason} valueClass="text-rose-600 font-medium" />
                                    <DetailRow label="Error Code" value={bounce.code} valueClass="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs" />
                                    <DetailRow label="Bounced At" value={bounce.date} />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                                    Remove from List
                                </Button>
                                {bounce.type === 'Soft Bounce' && (
                                    <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                                        Retry Send
                                    </Button>
                                )}
                                <Button variant="ghost" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                                    View Campaign <ArrowUp className="h-3 w-3 rotate-45" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function DetailRow({ label, value, valueClass }: any) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">{label}</span>
            <span className={`text-slate-900 ${valueClass}`}>{value}</span>
        </div>
    );
}

