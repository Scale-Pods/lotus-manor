"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw, Volume2, MoreVertical, X, Phone, Clock, DollarSign, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";

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

    // Helper to get messages from various Vapi/ElevenLabs formats
    const getMessages = (data: any) => {
        if (!data) return [];

        // Priority 1: ElevenLabs transcript object
        if (Array.isArray(data.transcript) && data.transcript.length > 0) {
            return data.transcript.map((msg: any) => ({
                role: msg.role === 'agent' ? 'assistant' : 'user',
                message: msg.message || msg.content || msg.text
            }));
        }

        // Fallbacks
        if (Array.isArray(data.messages)) return data.messages;
        if (data.analysis && Array.isArray(data.analysis.transcript)) return data.analysis.transcript;
        if (typeof data.transcript === 'string') return [{ role: 'assistant', message: data.transcript }];

        return [];
    };

    const messages = getMessages(displayCall);
    const recordingUrl = displayCall.audio_url || displayCall.recordingUrl || displayCall.recording_url || displayCall.artifact?.recordingUrl;

    // Helper to format duration
    const getDuration = (data: any) => {
        let seconds = 0;
        // Check various ElevenLabs/normalized locations
        if (typeof data.call_duration_secs === 'number') seconds = data.call_duration_secs;
        else if (data.analysis?.call_duration_secs) seconds = data.analysis.call_duration_secs;
        else if (typeof data.durationSeconds === 'number') seconds = data.durationSeconds;
        else if (typeof data.duration === 'number') seconds = data.duration;

        if (seconds === 0 && data.endedAt && data.startedAt) {
            const start = new Date(data.startedAt).getTime();
            const end = new Date(data.endedAt).getTime();
            seconds = (end - start) / 1000;
        }

        // Active call fallback
        if (seconds === 0 && (data.status === 'in-progress' || data.status === 'processing') && data.metadata?.start_time_unix_secs) {
            const start = data.metadata.start_time_unix_secs * 1000;
            const now = Date.now();
            seconds = Math.max(0, (now - start) / 1000);
        }

        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}m ${sec}s`;
    };

    const durationDisplay = getDuration(displayCall);

    // ElevenLabs Cost Mapping
    // Cost is pre-formatted in /api/calls route as "X credits", fallback to displayCall.cost
    const costDisplay = displayCall.cost || (displayCall.metadata?.cost ? `${displayCall.metadata.cost} credits` : '$0.00');

    const startedAtDisplay = displayCall.metadata?.start_time_unix_secs
        ? new Date(displayCall.metadata.start_time_unix_secs * 1000).toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        })
        : (displayCall.startedAt ? new Date(displayCall.startedAt).toLocaleString() : (displayCall.date || 'N/A'));

    // Determine Call Type and entities
    const rawDynamicVars = displayCall.conversation_initiation_client_data?.dynamic_variables || {};
    const rawType = displayCall.type || displayCall.metadata?.type || rawDynamicVars.direction || rawDynamicVars.type || "unknown";
    const isInbound = rawType === 'inbound';

    // Default call type 
    const callTypeDisplay = isInbound ? "Inbound" : "Outbound";

    const callerNumber = displayCall.phone || displayCall.caller_number || displayCall.metadata?.caller_number || rawDynamicVars.caller_number || rawDynamicVars.caller || "Unknown";
    const calleeNumber = displayCall.callee_number || displayCall.metadata?.callee_number || rawDynamicVars.callee_number || rawDynamicVars.callee || "Unknown";
    const centralNumber = "97148714150";
    const assistantName = displayCall.agent_name || "ElevenLabs AI Agent";

    // Reconstruct connection logic
    let fromName;
    let fromSubInfo;
    let fromLabel;

    let toName;
    let toSubInfo;
    let toLabel;

    if (isInbound) {
        // Customer calls us
        fromName = "Guest";
        fromSubInfo = callerNumber;
        fromLabel = "From (Customer)";

        toName = assistantName;
        toSubInfo = centralNumber;
        toLabel = "To (Assistant)";
    } else {
        // We call the customer (or a Web Call simulating us calling)
        fromName = assistantName;
        fromSubInfo = centralNumber;
        fromLabel = "From (Assistant)";

        toName = "Guest";
        toSubInfo = calleeNumber !== "Unknown" ? calleeNumber : callerNumber;
        toLabel = "To (Customer)";
    }

    // Determine Audio Proxy route (avoiding exposing XI_API_KEY directly frontend)
    const audioUrl = displayCall.id ? `/api/calls/${displayCall.id}/audio` : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 gap-0 bg-white overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-semibold">Call Details</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    {/* Call Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50/50 border-b border-slate-100 items-start">
                        {/* Column 1: Status & Type */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                                <Badge className={`${displayCall.status === 'done' || displayCall.status === 'ended' || displayCall.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} border-none shadow-none uppercase text-[10px] px-2.5 py-0.5`}>
                                    {displayCall.status || 'Unknown'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Type</p>
                                <Badge variant="outline" className="border-slate-300 text-slate-600 uppercase text-[10px] px-2.5 py-0.5">
                                    {callTypeDisplay}
                                </Badge>
                            </div>
                        </div>

                        {/* Column 2: Duration & Date */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Duration</p>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="font-bold text-slate-900">{durationDisplay}</span>
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

                        {/* Column 3: Cost breakdown Top */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Call Cost</p>
                                <span className="font-bold text-slate-900">{displayCall.metadata?.charging?.call_charge || 0} credits</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Credits (LLM)</p>
                                <span className="font-bold text-slate-900">{displayCall.llm_charge || displayCall.metadata?.charging?.llm_charge || 0}</span>
                            </div>
                        </div>

                        {/* Column 4: LLM Cost */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">LLM Cost</p>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900">
                                        ${((displayCall.llm_price || displayCall.metadata?.charging?.llm_price || 0) / Math.max(1, (displayCall.durationSeconds / 60) || 1)).toFixed(4)} / min
                                    </span>
                                    <span className="text-xs text-slate-500 mt-0.5">
                                        Total: ${(displayCall.llm_price || displayCall.metadata?.charging?.llm_price || 0).toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Call Information */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Call Information</h3>
                            <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-3 px-2">
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">{fromLabel}</p>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">{toLabel}</p>
                                </div>
                                <div className="flex items-center justify-between gap-4">

                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${fromLabel.includes('Assistant') ? 'bg-purple-100 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {fromLabel.includes('Assistant') ? <Avatar><AvatarFallback>AI</AvatarFallback></Avatar> : <Phone className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 font-semibold text-slate-900 border border-slate-200 bg-slate-50/50 rounded-lg px-4 py-3">
                                            <span className="block text-sm">{fromName}</span>
                                            {fromSubInfo !== "Unknown" && fromSubInfo !== "Website/API" && (
                                                <span className="block text-xs font-normal text-slate-500 mt-0.5 tracking-wide">{`+${fromSubInfo.replace(/\+/g, '')}`}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center px-4 shrink-0">
                                        <span className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mb-2">{isInbound ? "INBOUND" : "OUTBOUND"}</span>
                                        <div className="h-0.5 w-20 bg-blue-200 relative">
                                            <ArrowRight className="w-4 h-4 text-blue-600 absolute -right-1.5 -top-[7px]" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex-1 font-semibold text-slate-900 border border-slate-200 bg-slate-50/50 rounded-lg px-4 py-3 text-right">
                                            <span className="block text-sm">{toName}</span>
                                            {toSubInfo !== "Unknown" && toSubInfo !== "Website/API" && (
                                                <span className="block text-xs font-normal text-slate-500 mt-0.5 tracking-wide">{`+${toSubInfo.replace(/\+/g, '')}`}</span>
                                            )}
                                        </div>
                                        <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${toLabel.includes('Assistant') ? 'bg-purple-100 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {toLabel.includes('Assistant') ? <Avatar><AvatarFallback>AI</AvatarFallback></Avatar> : <Phone className="h-5 w-5" />}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Audio Player Section */}
                            {audioUrl && (
                                <ModernAudioPlayer audioUrl={audioUrl} />
                            )}
                        </div>

                        {/* Transcript */}
                        <div className="flex-1 min-h-[200px]">
                            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Transcript</h3>
                            <ScrollArea className="h-[300px] w-full rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="space-y-4">
                                    {Array.isArray(messages) && messages
                                        .filter((msg: any) => msg.role !== 'system') // Filter out system prompt
                                        .map((msg: any, idx: number) => (
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

            </DialogContent>
        </Dialog>
    );
}

function ModernAudioPlayer({ audioUrl }: { audioUrl: string }) {
    return (
        <div className="mt-6 p-5 border border-slate-200 rounded-xl bg-slate-50/50 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600">
                    <Volume2 className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-none">Call Recording</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Play to review conversation</p>
                </div>
            </div>
            <audio
                src={audioUrl}
                controls
                className="w-full h-12"
                preload="metadata"
            />
        </div>
    );
}

function TranscriptMessage({ role, text }: { role: string; text: string }) {
    const isAssistant = role === 'assistant' || role === 'model' || role === 'system' || role === 'bot';
    const isUser = role === 'user';
    const isTool = role === 'tool' || role === 'function' || role === 'tool-calls' || role === 'tool-output';

    if (isTool) {
        // Optional: Render tools differently or skip
        return (
            <div className="flex gap-3 justify-center">
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono max-w-[80%] whitespace-pre-wrap text-center">
                    Tool Info: {text}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isAssistant ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {isAssistant ? <span className="text-xs font-bold">AI</span> : <span className="text-xs font-bold">U</span>}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isAssistant
                ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                {text}
            </div>
        </div>
    );
}
