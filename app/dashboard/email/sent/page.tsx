"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Bell,
    Search,
    Filter,
    Mail,
    ChevronDown,
    ChevronUp,
    Calendar as CalendarIcon,
    ArrowRight,
    ArrowLeft,
    ExternalLink
} from "lucide-react";
import React, { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Mock Data
const sentEmails = Array.from({ length: 170 }).map((_, i) => ({
    id: i + 1,
    recipient: i % 2 === 0 ? "a.naseri@iconiccore.com" : "sarah.j@designstudio.ae",
    sender: "N/A",
    type: "1st Follow-up",
    sentDate: "Dec 8, 2025, 04:02 AM",
    subject: i % 2 === 0 ? "Customer Support Omni Channel Chatbot" : "Design assets received",
    content: "Hi Ali,\n\nI hope this email finds you well.\n\nI wanted to follow up on our previous conversation regarding the Customer Support Omni Channel Chatbot and the Founder's AI Assistant we discussed.\n\nWe have made significant progress and I would love to share the updates with you.\n\nBest regards,\nAdnan Shaikh\nServiots x ScalePods",
    socials: [
        { name: "LinkedIn Serviots", url: "#" },
        { name: "LinkedIn ScalePods", url: "#" },
        { name: "Instagram ScalePods", url: "#" }
    ]
}));

const ITEMS_PER_PAGE = 10;

export default function SentEmailsPage() {
    const [page, setPage] = useState(1);
    const [date, setDate] = useState<Date>();
    const [filters, setFilters] = useState({
        campaign: "all",
        sender: "all",
        type: "all"
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        console.log(`Filter ${key} changed to:`, value);
    };

    const totalPages = Math.ceil(sentEmails.length / ITEMS_PER_PAGE);
    const paginatedEmails = sentEmails.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sent Emails</h1>
                    <p className="text-slate-500">View all sent emails from your campaigns</p>
                </div>

            </div>

            {/* Search & Filters Section */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by recipient email or content..."
                        className="pl-10 bg-white border-slate-200"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select value={filters.campaign} onValueChange={(val) => handleFilterChange("campaign", val)}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="All Campaigns" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            <SelectItem value="q1">Q1 Outreach</SelectItem>
                            <SelectItem value="newsletter">Newsletter</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.sender} onValueChange={(val) => handleFilterChange("sender", val)}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="All Senders" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Senders</SelectItem>
                            <SelectItem value="adnan">Adnan Shaikh</SelectItem>
                            <SelectItem value="support">Support Team</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.type} onValueChange={(val) => handleFilterChange("type", val)}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="All Mail Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Mail Types</SelectItem>
                            <SelectItem value="initial">Initial Video</SelectItem>
                            <SelectItem value="followup">1st Follow-up</SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("justify-start text-left font-normal bg-white border-slate-200", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Select dates</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Email List Items */}
            <div className="space-y-4">
                {paginatedEmails.map((email) => (
                    <SentEmailCard key={email.id} email={email} />
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                    Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span>-
                    <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, sentEmails.length)}</span> of
                    <span className="font-medium"> {sentEmails.length}</span> recipients
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="gap-1"
                    >
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-600">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="gap-1"
                    >
                        Next <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SentEmailCard({ email }: { email: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
            <CollapsibleTrigger asChild>
                <div className="p-6 cursor-pointer group">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 shrink-0 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] tracking-wider font-bold">SENT EMAIL</Badge>
                                    <Badge variant="outline" className="text-cyan-600 border-cyan-200 bg-cyan-50 text-[10px]">From: {email.sender}</Badge>
                                    <Badge variant="outline" className="text-cyan-600 border-cyan-200 bg-cyan-50 text-[10px] gap-1">
                                        {email.type} - {email.sentDate} <ChevronDown className="h-3 w-3" />
                                    </Badge>
                                </div>
                                <h4 className="text-lg font-bold text-slate-900">{email.recipient}</h4>
                                {!isOpen && (
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm text-slate-500 truncate max-w-md">{email.subject} - {email.content.substring(0, 50)}...</p>
                                        <span className="text-xs text-cyan-600 font-medium whitespace-nowrap">(click to read more)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0">
                            {isOpen ?
                                <ChevronUp className="h-5 w-5 text-slate-400" /> :
                                <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                            }
                        </div>
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="px-6 pb-6 pt-0">
                    <div className="pl-[56px] space-y-4 border-t border-slate-100 pt-4">
                        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
                            <p className="whitespace-pre-wrap">{email.content}</p>

                            <ul className="list-disc pl-5 space-y-1">
                                <li>Customer Support Omni Channel Chatbot</li>
                                <li>Founder's AI Assistant</li>
                            </ul>

                            <div className="py-2">
                                <a href="#" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline">
                                    <CalendarIcon className="h-4 w-4" /> Schedule a meeting 📅
                                </a>
                            </div>

                            <div className="pt-2 text-slate-500">
                                <p className="font-bold text-slate-900">Adnan Shaikh</p>
                                <p>Serviots x ScalePods</p>
                                <div className="flex gap-3 mt-1 text-xs">
                                    {email.socials.map((social: any, idx: number) => (
                                        <a key={idx} href={social.url} className="hover:text-cyan-600 transition-colors uppercase font-bold tracking-tight">
                                            {social.name} {idx < email.socials.length - 1 && "|"}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
