"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, SkipBack, SkipForward, Volume2, MoreVertical, X, Phone, Clock, DollarSign, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

interface CallDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    call: any;
}

export function CallDetailsModal({ open, onOpenChange, call }: CallDetailsModalProps) {
    const [fullCall, setFullCall] = useState<any>(null);
    const [localLoading, setLocalLoading] = useState(false);

    useEffect(() => {
        if (open && call?.id) {
            setFullCall(call); // Set initial data
            setLocalLoading(true);
            // Fetch fresh details to get messages/transcript if not present
            fetch(`/api/calls/${call.id}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) setFullCall(data);
                })
                .catch(err => console.error("Error fetching details", err))
                .finally(() => setLocalLoading(false));
        }
    }, [open, call]);

    if (!call) return null;

    const displayCall = fullCall || call;
    // Helper to get messages from various Vapi formats
    const getMessages = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data.messages)) return data.messages;
        if (data.analysis && Array.isArray(data.analysis.transcript)) return data.analysis.transcript;
        if (Array.isArray(data.transcript)) return data.transcript;
        // If transcript is a string, wrap it in a single message
        if (typeof data.transcript === 'string') return [{ role: 'assistant', message: data.transcript }];
        return [];
    };

    const messages = getMessages(displayCall);
    const recordingUrl = displayCall.recordingUrl || displayCall.recording_url;

    // Helper to format duration
    const getDuration = (data: any) => {
        let seconds = 0;
        if (typeof data.durationSeconds === 'number') seconds = data.durationSeconds;
        else if (typeof data.duration === 'number') seconds = data.duration;

        if (seconds === 0 && data.endedAt && data.startedAt) {
            const start = new Date(data.startedAt).getTime();
            const end = new Date(data.endedAt).getTime();
            seconds = (end - start) / 1000;
        }

        // If call is active (no endedAt)
        if (seconds === 0 && data.status === 'active' && data.startedAt) {
            const start = new Date(data.startedAt).getTime();
            const now = Date.now();
            seconds = (now - start) / 1000;
        }

        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}m ${sec}s`;
    };

    const durationDisplay = getDuration(displayCall);
    const costDisplay = typeof displayCall.cost === 'number' ? `$${displayCall.cost.toFixed(2)}` : (displayCall.cost ? `$${parseFloat(displayCall.cost).toFixed(2)}` : '$0.00');
    const startedAtDisplay = displayCall.startedAt ? new Date(displayCall.startedAt).toLocaleString() : (displayCall.date || 'N/A');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 gap-0 bg-white overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-semibold">Call Details</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    {/* Call Overview */}
                    <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50/50 border-b border-slate-100">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Execution ID</p>
                                <p className="font-mono text-sm text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 w-fit">{displayCall.id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none shadow-none uppercase text-[10px] px-2.5 py-0.5">
                                    {displayCall.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Duration</p>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="font-bold text-slate-900">{durationDisplay}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Cost</p>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-slate-400" />
                                        <span className="font-bold text-slate-900">{costDisplay}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Date & Time</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">{startedAtDisplay}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Call Information */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Call Information</h3>
                            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                                        <Phone className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">From</p>
                                        <p className="font-bold text-slate-900 font-mono">{displayCall.customer?.number || displayCall.customer?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="h-px w-12 bg-slate-300"></div>
                                <div className="flex items-center gap-4 text-right">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">To</p>
                                        <p className="font-bold text-slate-900 font-mono">{displayCall.phoneNumber?.number || 'Assistant'}</p>
                                    </div>
                                    <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayCall.id}`} />
                                            <AvatarFallback>AI</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transcript */}
                        <div className="flex-1 min-h-[200px]">
                            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Transcript</h3>
                            <ScrollArea className="h-[250px] w-full rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="space-y-4">
                                    {Array.isArray(messages) && messages.map((msg: any, idx: number) => (
                                        <TranscriptMessage
                                            key={idx}
                                            role={msg.role}
                                            text={msg.message || msg.content || msg.text || ''}
                                        />
                                    ))}
                                    {(!messages || messages.length === 0) && (
                                        <p className="text-sm text-slate-500 text-center italic">No transcript available.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                {/* Recording Player Footer */}
                {recordingUrl && (
                    <div className="p-4 bg-slate-900 text-white border-t border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Recording</span>
                        </div>
                        <audio controls src={recordingUrl} className="w-full h-8" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function TranscriptMessage({ role, text }: { role: string; text: string }) {
    const isAssistant = role === 'assistant' || role === 'model' || role === 'system';
    const isUser = role === 'user';
    const isTool = role === 'tool' || role === 'function';

    if (isTool) {
        // Optional: Render tools differently or skip
        return (
            <div className="flex gap-3 justify-center">
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    Tool Use: {text}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isAssistant ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {isAssistant ? <span className="text-xs font-bold">AI</span> : <span className="text-xs font-bold">U</span>}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${isAssistant
                ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                {text}
            </div>
        </div>
    );
}
