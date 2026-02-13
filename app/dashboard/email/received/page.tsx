"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Bell,
    Mail,
    ChevronDown,
    ChevronUp,
    Reply,
    Search,
    Calendar as CalendarIcon
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
import { consolidateLeads } from "@/lib/leads-utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";

// Mock data removed


export default function ReceivedEmailsPage() {
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<any>(undefined);

    useEffect(() => {
        const fetchReplies = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const rawData = await res.json();
                const leads = consolidateLeads(rawData);

                const realReplies: any[] = [];
                leads.forEach((lead: any, index: number) => {
                    // Check if lead replied specifically via email
                    const emailReply = lead.email_replied || lead.Email_Replied || lead.replied;

                    if (emailReply && emailReply !== "No" && emailReply !== "none") {
                        const trimmed = String(emailReply).trim();
                        const lines = trimmed.split('\n');
                        const lastLine = lines[lines.length - 1].trim();

                        // Detect if there's a timestamp at the end of the reply column
                        const lastLineDate = new Date(lastLine);
                        let displayDate = lead.created_at;
                        let cleanEmailReply = emailReply;

                        if (!isNaN(lastLineDate.getTime()) && lastLine.includes('-') && lastLine.includes(':')) {
                            displayDate = lastLineDate.toISOString();
                            // If it's a timestamp, the rest is the content
                            cleanEmailReply = lines.slice(0, -1).join('\n').trim() || "Email Reply Received";
                        }
                        realReplies.push({
                            id: `${lead.id || index}-email-reply`,
                            sender: lead.email || "No Email Provided",
                            status: "Replied",
                            subject: "Email Reply",
                            timestamp: displayDate ? format(new Date(displayDate), 'MMM dd, yyyy • p') : "Unknown Date",
                            senderName: lead.name || "Lead",
                            content: cleanEmailReply,
                            originalDate: displayDate,
                            loop: lead.source_loop
                        });
                    }
                });
                // Sort replies by date (newest first)
                realReplies.sort((a, b) => {
                    const dateA = a.originalDate ? new Date(a.originalDate).getTime() : 0;
                    const dateB = b.originalDate ? new Date(b.originalDate).getTime() : 0;
                    return dateB - dateA;
                });
                setReplies(realReplies);
            } catch (e) {
                console.error("Received emails fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchReplies();
    }, []);

    const filteredReplies = replies.filter(reply => {
        const matchesStatus = statusFilter === "all" || reply.status === statusFilter;
        const matchesSearch = reply.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reply.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            reply.senderName.toLowerCase().includes(searchQuery.toLowerCase());

        // Date Range Filtering
        if (dateRange?.from) {
            const replyDateStr = reply.originalDate;
            if (!replyDateStr) return false;
            const replyDate = new Date(replyDateStr);
            if (isNaN(replyDate.getTime())) return false;

            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : from;
            to.setHours(23, 59, 59, 999);

            if (replyDate < from || replyDate > to) return false;
        }

        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Received Emails</h1>
                    <p className="text-slate-500">View all received emails and replies from your campaigns</p>
                </div>

            </div>

            {/* Summary Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">{loading ? "..." : filteredReplies.length} replies received</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Total Replies</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Mail className="h-6 w-6" />
                    </div>
                </CardContent>
            </Card>

            {/* Search & Filters Section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by sender or content..."
                            className="pl-10 bg-slate-50 border-slate-200"
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
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="Dropped">Dropped</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select defaultValue="newest">
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 h-9 text-xs ml-auto bg-slate-100 hover:bg-slate-200"
                        onClick={() => {
                            setSearchQuery("");
                            setDateRange(undefined);
                            setStatusFilter("all");
                        }}
                    >
                        Reset Filters
                    </Button>
                </div>
            </div>

            {/* Email Reply List */}
            <div className="space-y-4">
                {filteredReplies.map((reply) => (
                    <EmailReplyCard key={reply.id} reply={reply} />
                ))}
                {!loading && filteredReplies.length === 0 && (
                    <div className="p-10 text-center text-slate-500">No replies found.</div>
                )}
            </div>
        </div>
    );
}


function EmailReplyCard({ reply }: { reply: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
            <CollapsibleTrigger asChild>
                <div className="p-6 flex items-center gap-4 cursor-pointer group">
                    <div className="h-12 w-12 shrink-0 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                        <Reply className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-lg font-bold text-slate-900 truncate">{reply.senderName}</h4>
                                <Badge variant="outline" className="text-purple-600 bg-purple-50 border-purple-100 text-[10px] uppercase font-bold">
                                    {reply.loop}
                                </Badge>
                                {reply.timestamp && (
                                    <Badge variant="outline" className="text-cyan-600 bg-cyan-50 border-cyan-100 text-[10px] font-bold">{reply.timestamp}</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <p className="text-xs text-slate-500 font-medium truncate">{reply.sender}</p>
                        </div>
                    </div>

                    <div className="shrink-0 p-2 rounded-full text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600 transition-colors">
                        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="px-6 pb-6 pt-0">
                    <div className="pl-[64px] space-y-4 border-t border-slate-100 pt-4">
                        {/* Email Body */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {reply.content}
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
