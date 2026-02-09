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

// Mock data removed


export default function ReceivedEmailsPage() {
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchReplies = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const leads = await res.json();

                const realReplies: any[] = [];
                leads.forEach((lead: any, index: number) => {
                    // Check if lead replied
                    if (lead.replied && lead.replied !== "No") {
                        realReplies.push({
                            id: `${lead.id || index}-reply`,
                            sender: lead.email || "Unknown Sender",
                            status: lead.replied, // Store raw status for filtering
                            subject: "New Reply",
                            timestamp: "Just now",
                            senderName: lead.firstName ? `${lead.firstName} ${lead.lastName || ''}` : "Lead",
                            content: `Lead replied: ${lead.replied}`,
                            originalMessage: {
                                sender: "System",
                                timestamp: "Previously",
                                content: "Original message content..."
                            }
                        });
                    }
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
            reply.content.toLowerCase().includes(searchQuery.toLowerCase());
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
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by sender or content..."
                        className="pl-10 bg-white border-slate-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="Dropped">Dropped</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                        </SelectContent>
                    </Select>

                    <DateFilter />
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

function DateFilter() {
    const [date, setDate] = useState<Date>();
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <Button variant="outline" className={cn("justify-start text-left font-normal bg-white border-slate-200 animate-pulse")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="w-24 h-4 bg-slate-100 rounded"></span>
            </Button>
        );
    }

    return (
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
    );
}

function EmailReplyCard({ reply }: { reply: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
            <CollapsibleTrigger asChild>
                <div className="p-6 flex items-center gap-4 cursor-pointer group">
                    <div className="h-12 w-12 shrink-0 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                        <Mail className="h-6 w-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-lg font-bold text-slate-900 truncate">{reply.sender}</h4>
                            <span className="text-xs text-slate-400 font-medium">{reply.timestamp}</span>
                        </div>
                        {!isOpen && (
                            <p className="text-sm text-slate-500 truncate">{reply.content}</p>
                        )}
                    </div>

                    <div className="shrink-0 p-2 rounded-full text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600 transition-colors">
                        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="px-6 pb-6 pt-0">
                    <div className="pl-[60px] space-y-4">
                        {/* Reply Header */}
                        <div>
                            <h5 className="font-bold text-slate-900">{reply.subject} <span className="font-normal text-slate-500 ml-2">On {reply.timestamp} {reply.senderName}</span></h5>
                        </div>

                        {/* Email Body */}
                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {reply.content}
                        </div>

                        {/* Quoted Original Message */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 mb-1">{reply.originalMessage.sender} wrote:</p>
                            <div className="pl-3 border-l-2 border-slate-200 text-xs text-slate-500 italic">
                                {reply.originalMessage.content}
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                                <Reply className="h-4 w-4" /> Reply
                            </Button>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
