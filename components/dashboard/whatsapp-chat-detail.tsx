"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw,
    Download,
    MessageSquare,
    User,
    Bot,
} from "lucide-react";
import { consolidateLeads, ConsolidatedLead } from "@/lib/leads-utils";

interface WhatsAppChatDetailProps {
    customerId: string;
    onClose?: () => void;
}

export function WhatsAppChatDetail({ customerId, onClose }: WhatsAppChatDetailProps) {
    const [lead, setLead] = useState<ConsolidatedLead | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const fetchLead = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/leads');
                if (!res.ok) throw new Error("Failed");
                const rawData = await res.json();
                const allLeads = consolidateLeads(rawData);
                const found = allLeads.find(l => l.id === customerId);

                if (found) {
                    setLead(found);
                    const timeline: any[] = [];

                    for (let i = 1; i <= 6; i++) {
                        const content = found[`W.P_${i}`] || found.stage_data?.[`WhatsApp ${i}`];
                        if (content && String(content).trim()) {
                            timeline.push({
                                type: 'bot',
                                content: String(content),
                                label: `WhatsApp ${i}`,
                                date: found.created_at
                            });
                        }
                    }

                    const replyContent = found.whatsapp_replied || found.stage_data?.["WhatsApp Replied"];
                    if (replyContent && String(replyContent).trim() && String(replyContent).toLowerCase() !== "no" && String(replyContent).toLowerCase() !== "none") {
                        const trimmed = String(replyContent).trim();
                        const lines = trimmed.split('\n');
                        const lastLine = lines[lines.length - 1].trim();
                        const lastLineDate = new Date(lastLine);

                        let displayContent = trimmed;
                        let displayDate = found.created_at;

                        if (!isNaN(lastLineDate.getTime()) && lastLine.includes('-') && lastLine.includes(':')) {
                            displayContent = lines.slice(0, -1).join('\n').trim() || "Message Received";
                            displayDate = lastLineDate.toISOString();
                        }

                        timeline.push({
                            type: 'user',
                            content: displayContent,
                            label: 'Reply Received',
                            date: displayDate
                        });
                    }

                    const followup = found.stage_data?.["WhatsApp FollowUp"] || found["W.P_FollowUp"];
                    if (followup && String(followup).trim()) {
                        timeline.push({
                            type: 'bot',
                            content: String(followup),
                            label: 'WhatsApp FollowUp',
                            date: found.created_at
                        });
                    }

                    setMessages(timeline);
                }
            } catch (err) {
                console.error("Fetch lead detail error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLead();
    }, [customerId]);

    if (loading) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center space-y-4 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="font-medium">Fetching conversation history...</p>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center space-y-4 text-slate-400">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="font-medium">Lead not found</p>
                {onClose && <Button variant="outline" onClick={onClose}>Close</Button>}
            </div>
        );
    }

    return (
        <div className="space-y-6 flex flex-col h-full overflow-hidden max-h-[85vh]">
            {/* Header Data */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{lead.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{lead.phone}</span>
                        <span>•</span>
                        <span>{lead.source_loop} Loop</span>
                    </div>
                </div>
                
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
                {/* Chat History */}
                <div className="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full min-h-0">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-3 px-4 flex justify-between items-center shrink-0">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation Timeline</h3>
                        <div className="text-[10px] text-slate-400 font-bold">{messages.length} Messages</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                                <MessageSquare className="h-10 w-10 opacity-20" />
                                <p className="text-sm">No WhatsApp messages found in database.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.type === 'user' ? 'items-start' : 'items-end'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.type === 'user'
                                        ? 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                                        : 'bg-emerald-600 text-white rounded-tr-none'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${msg.type === 'user' ? 'text-slate-400' : 'text-emerald-100'}`}>
                                                {msg.label}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                            {msg.content}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                                        {new Date(msg.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Lead Info Sidebar */}
                <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-1 h-full pb-4">
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-4 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" /> Lead Information
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Contact info</span>
                                    <p className="font-medium text-slate-900 mt-1">{lead.phone}</p>
                                    <p className="text-slate-500 text-xs">{lead.email}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Campaign</span>
                                    <Badge className="mt-1 bg-purple-100 text-purple-700 hover:bg-purple-100 border-none text-[10px] font-bold uppercase">
                                        {lead.source_loop} Loop
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-4 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900">Activity Stats</h3>
                            <div className="grid grid-cols-1 gap-2">
                                <StatBox label="Total Messages" value={messages.length} icon={MessageSquare} />
                                <StatBox label="Incoming" value={messages.filter(m => m.type === 'user').length} icon={User} />
                                <StatBox label="Outgoing" value={messages.filter(m => m.type === 'bot').length} icon={Bot} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon: Icon }: any) {
    return (
        <div className="p-2 px-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">{label}</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{value}</span>
        </div>
    );
}
