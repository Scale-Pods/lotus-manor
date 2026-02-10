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
    ExternalLink,
    Loader2
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
import { getEmailDetailsFromTemplates } from "@/lib/email-content";

const ITEMS_PER_PAGE = 7;

export default function SentEmailsPage() {
    const [page, setPage] = useState(1);
    const [dateRange, setDateRange] = useState<any>(undefined);
    const [sentEmails, setSentEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        campaign: "all",
        sender: "all",
        type: "all"
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch both leads and templates in parallel
                const [leadsRes, templatesRes] = await Promise.all([
                    fetch('/api/leads'),
                    fetch('/api/templates')
                ]);

                if (!leadsRes.ok) throw new Error("Failed to fetch leads");
                // Templates might fail but we can proceed with empty templates

                const leads = await leadsRes.json();
                const templates = templatesRes.ok ? await templatesRes.json() : [];

                const emails: any[] = [];

                leads.forEach((lead: any, leadIndex: number) => {
                    const stages = lead.stages_passed || [];
                    stages.forEach((stage: string) => {
                        if (stage.toLowerCase().includes("email")) {
                            const leadName = lead.name || lead.firstName || `Lead ${lead.id || leadIndex + 1}`;

                            // Use synchronous processing with fetched templates
                            const details = getEmailDetailsFromTemplates(stage, leadName, templates);

                            emails.push({
                                id: `${lead.id || `lead-${leadIndex}`}-${stage.replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`,
                                recipient: lead.email || leadName,
                                sender: "Adnan Shaikh", // This could be dynamic if data available
                                type: stage,
                                sentDate: lead.created_at || lead.createdAt || lead.date ? new Date(lead.created_at || lead.createdAt || lead.date).toLocaleDateString() : "Unknown Date",
                                subject: details.subject,
                                content: details.content,
                                loop: details.loop,
                                rawDate: lead.created_at || lead.createdAt || lead.date
                            });
                        }
                    });
                });

                setSentEmails(emails);
            } catch (e) {
                console.error("Sent emails fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page on filter change
    };

    // Filter emails BEFORE pagination
    const filteredEmails = sentEmails.filter(email => {
        // Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !email.recipient.toLowerCase().includes(query) &&
                !email.subject.toLowerCase().includes(query) &&
                !email.content.toLowerCase().includes(query)
            ) {
                return false;
            }
        }

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

        // Campaign
        if (filters.campaign !== "all") {
            if (filters.campaign === "intro" && !email.loop.toLowerCase().includes("intro")) return false;
            if (filters.campaign === "nurture" && !email.loop.toLowerCase().includes("nurture")) return false;
            if (filters.campaign === "followup" && !email.loop.toLowerCase().includes("follow")) return false;
        }

        // Sender
        if (filters.sender !== "all") {
            if (filters.sender === "adnan" && !email.sender.toLowerCase().includes("adnan")) return false;
            // Add more senders if necessary
        }

        // Type
        if (filters.type !== "all") {
            if (filters.type === "email1" && !email.type.toLowerCase().includes("email 1")) return false;
            if (filters.type === "email2" && !email.type.toLowerCase().includes("email 2")) return false;
            if (filters.type === "email3" && !email.type.toLowerCase().includes("email 3")) return false;
            if (filters.type === "email4" && !email.type.toLowerCase().includes("email 4")) return false;
            if (filters.type === "email5" && !email.type.toLowerCase().includes("email 5")) return false;
            if (filters.type === "email6" && !email.type.toLowerCase().includes("email 6")) return false;
            if (filters.type === "email7" && !email.type.toLowerCase().includes("email 7")) return false;
            if (filters.type === "email8" && !email.type.toLowerCase().includes("email 8")) return false;
            if (filters.type === "email9" && !email.type.toLowerCase().includes("email 9")) return false;
            if (filters.type === "email10" && !email.type.toLowerCase().includes("email 10")) return false;
            if (filters.type === "email11" && !email.type.toLowerCase().includes("email 11")) return false;
            if (filters.type === "email12" && !email.type.toLowerCase().includes("email 12")) return false;
            if (filters.type === "email13" && !email.type.toLowerCase().includes("email 13")) return false;
            if (filters.type === "email14" && !email.type.toLowerCase().includes("email 14")) return false;
            if (filters.type === "email15" && !email.type.toLowerCase().includes("email 15")) return false;
            if (filters.type === "email16" && !email.type.toLowerCase().includes("email 16")) return false;
            if (filters.type === "email17" && !email.type.toLowerCase().includes("email 17")) return false;
            if (filters.type === "email18" && !email.type.toLowerCase().includes("email 18")) return false;
            if (filters.type === "email19" && !email.type.toLowerCase().includes("email 19")) return false;
            if (filters.type === "email20" && !email.type.toLowerCase().includes("email 20")) return false;
            // Add other types as needed
        }

        return true;
    });

    const totalPages = Math.ceil(filteredEmails.length / ITEMS_PER_PAGE);
    const paginatedEmails = filteredEmails.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sent Emails</h1>
                    <p className="text-slate-500">View and manage your sent email history.</p>
                </div>
            </div>

            {/* Search & Filters Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search recipients, subjects..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <DateRangePicker
                        className="w-full md:w-[260px]"
                        onUpdate={(values) => setDateRange(values.range)}
                    />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Filter className="h-4 w-4 text-slate-400 mr-2" />

                    <Select value={filters.campaign} onValueChange={(val) => handleFilterChange('campaign', val)}>
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <SelectValue placeholder="Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            <SelectItem value="intro">Intro Loop</SelectItem>
                            <SelectItem value="nurture">Nurture Loop</SelectItem>
                            <SelectItem value="followup">Follow Up</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.sender} onValueChange={(val) => handleFilterChange('sender', val)}>
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <SelectValue placeholder="Sender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Senders</SelectItem>
                            <SelectItem value="adnan">Adnan Shaikh</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.type} onValueChange={(val) => handleFilterChange('type', val)}>
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <SelectValue placeholder="Email Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="email1">Email 1</SelectItem>
                            <SelectItem value="email2">Email 2</SelectItem>
                            <SelectItem value="email3">Email 3</SelectItem>
                            <SelectItem value="email4">Email 4</SelectItem>
                            <SelectItem value="email5">Email 5</SelectItem>
                            <SelectItem value="email6">Email 6</SelectItem>
                            <SelectItem value="email7">Email 7</SelectItem>
                            <SelectItem value="email8">Email 8</SelectItem>
                            <SelectItem value="email9">Email 9</SelectItem>
                            <SelectItem value="email10">Email 10</SelectItem>
                            <SelectItem value="email11">Email 11</SelectItem>
                            <SelectItem value="email12">Email 12</SelectItem>
                            <SelectItem value="email13">Email 13</SelectItem>
                            <SelectItem value="email14">Email 14</SelectItem>
                            <SelectItem value="email15">Email 15</SelectItem>
                            <SelectItem value="email16">Email 16</SelectItem>
                            <SelectItem value="email17">Email 17</SelectItem>
                            <SelectItem value="email18">Email 18</SelectItem>
                            <SelectItem value="email19">Email 19</SelectItem>
                            <SelectItem value="email20">Email 20</SelectItem>
                        </SelectContent>
                    </Select>

                    {(searchQuery || dateRange || filters.campaign !== 'all' || filters.sender !== 'all' || filters.type !== 'all') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 h-9 text-xs ml-auto"
                            onClick={() => {
                                setSearchQuery("");
                                setDateRange(undefined);
                                setFilters({ campaign: "all", sender: "all", type: "all" });
                                setPage(1);
                            }}
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Email List Items */}
            <div className="space-y-4 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p>Loading sent emails...</p>
                    </div>
                ) : paginatedEmails.length > 0 ? (
                    paginatedEmails.map((email) => (
                        <SentEmailCard key={email.id} email={email} />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Mail className="h-8 w-8 mb-2 opacity-50" />
                        <p>No emails found matching your filters</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && sentEmails.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span>-
                        <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, filteredEmails.length)}</span> of
                        <span className="font-medium"> {filteredEmails.length}</span> results
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
            )}
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
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</span>
                            <p className="text-sm font-semibold text-slate-900">{email.subject}</p>
                        </div>
                        <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
                            <p className="whitespace-pre-wrap">{email.content}</p>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
