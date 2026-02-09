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
import React, { useState, useEffect } from "react";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getEmailDetails } from "@/lib/email-content";

// Mock Data
// Mock data removed.


const ITEMS_PER_PAGE = 10;

export default function SentEmailsPage() {
    const [page, setPage] = useState(1);
    const [date, setDate] = useState<Date>();
    const [dateRange, setDateRange] = useState<any>(undefined);
    const [sentEmails, setSentEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        campaign: "all",
        sender: "all",
        type: "all"
    });

    useEffect(() => {
        const fetchSentEmails = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const leads = await res.json();

                const emailPromises: Promise<any>[] = [];

                leads.forEach((lead: any, leadIndex: number) => {
                    const stages = lead.stages_passed || [];
                    stages.forEach((stage: string, stageIndex: number) => {
                        if (stage.toLowerCase().includes("email")) {
                            emailPromises.push((async () => {
                                const leadName = lead.name || lead.firstName || `Lead ${lead.id || leadIndex + 1}`;
                                const details = await getEmailDetails(stage, leadName);
                                // ...
                                return {
                                    id: `${lead.id || `lead-${leadIndex}`}-${stage.replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`,
                                    recipient: lead.email || leadName,
                                    sender: "Adnan Shaikh",
                                    type: stage,
                                    // ...
                                    sentDate: lead.created_at || lead.createdAt || lead.date ? new Date(lead.created_at || lead.createdAt || lead.date).toLocaleDateString() : "Unknown Date",
                                    subject: details.subject,
                                    content: details.content,
                                    loop: details.loop,
                                    // ...
                                    rawDate: lead.created_at || lead.createdAt || lead.date
                                };
                            })());
                        }
                    });
                });

                const emails = await Promise.all(emailPromises);
                setSentEmails(emails);
            } catch (e) {
                console.error("Sent emails fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchSentEmails();
    }, []);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const totalPages = Math.ceil(sentEmails.length / ITEMS_PER_PAGE);

    // Filter emails BEFORE pagination
    const filteredEmails = sentEmails.filter(email => {
        // Date Range
        if (dateRange?.from) {
            const emailDateStr = email.rawDate;
            if (!emailDateStr) return false;
            const emailDate = new Date(emailDateStr);
            if (isNaN(emailDate.getTime())) return false;

            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : from;
            to.setHours(23, 59, 59, 999);

            if (emailDate < from || emailDate > to) return false;
        }

        // Campaign - Assuming 'loop' maps to campaign broadly
        if (filters.campaign !== "all") {
            if (filters.campaign === "q1" && !email.loop.toLowerCase().includes("intro")) return false;
            if (filters.campaign === "newsletter" && !email.loop.toLowerCase().includes("nurture")) return false;
        }

        // Sender - Hardcoded to "Adnan Shaikh" in this view currently, but adding logic
        if (filters.sender !== "all") {
            if (filters.sender === "adnan" && !email.sender.toLowerCase().includes("adnan")) return false;
            if (filters.sender === "support" && !email.sender.toLowerCase().includes("support")) return false;
        }

        // Type
        if (filters.type !== "all") {
            // initial video -> Email 1 usually? 
            if (filters.type === "initial" && !email.type.toLowerCase().includes("email 1")) return false;
            if (filters.type === "followup" && !email.type.toLowerCase().includes("follow")) return false;
        }

        return true;
    });

    const paginatedEmails = filteredEmails.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto">
            {/* ... header ... */}
            {/* Search & Filters Section */}
            <div className="space-y-4">
                {/* ... search ... */}
                {/* ... filters ... */} {/* No changes needed in render, just logic above */}
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
                                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 text-[10px] uppercase font-bold">{email.loop}</Badge>
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


                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
