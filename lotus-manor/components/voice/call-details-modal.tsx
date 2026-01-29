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

interface CallDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    call: any;
}

export function CallDetailsModal({ open, onOpenChange, call }: CallDetailsModalProps) {
    if (!call) return null;

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
                                <p className="font-mono text-sm text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 w-fit">{call.id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none shadow-none uppercase text-[10px] px-2.5 py-0.5">
                                    {call.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Duration</p>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="font-bold text-slate-900">{call.duration}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Cost</p>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-slate-400" />
                                        <span className="font-bold text-slate-900">{call.cost}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Date & Time</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">{call.date}</span>
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
                                        <p className="font-bold text-slate-900 font-mono">+918035735856</p>
                                    </div>
                                </div>
                                <div className="h-px w-12 bg-slate-300"></div>
                                <div className="flex items-center gap-4 text-right">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">To</p>
                                        <p className="font-bold text-slate-900 font-mono">+919313197357</p>
                                    </div>
                                    <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${call.id}`} />
                                            <AvatarFallback>U</AvatarFallback>
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
                                    <TranscriptMessage role="assistant" text="Hi" />
                                    <TranscriptMessage role="user" text="hello" />
                                    <TranscriptMessage role="assistant" text="नमस्ते, सिटीफोर्स हॉस्पिटल में आपका स्वागत है। मैं आपकी क्या मदद कर सकती हूं?" />
                                    <TranscriptMessage role="user" text="हां जी मुझे एक appointment book कराना था" />
                                    <TranscriptMessage role="assistant" text="क्या आप अपॉइंटमेंट बुक करना चाहते हैं, या आपका कोई सामान्य सवाल है?" />
                                    <TranscriptMessage role="user" text="जी appointment book कराना है" />
                                    <TranscriptMessage role="assistant" text="कृपया मरीज़ का पूरा नाम बताइए।" />
                                    <TranscriptMessage role="user" text="yes please" />
                                    <TranscriptMessage role="assistant" text="मुझे खेद है, मुझे समझ नहीं आया। कृपया दोबारा साफ हिंदी में बोलें।" />
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                {/* Recording Player Footer */}
                <div className="p-4 bg-slate-900 text-white border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Recording</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button size="icon" variant="ghost" className="text-white hover:text-white hover:bg-white/10 h-8 w-8 rounded-full">
                            <Play className="h-4 w-4 fill-white" />
                        </Button>
                        <span className="text-xs font-mono text-slate-300">0:00 / {call.duration}</span>
                        <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden relative group cursor-pointer">
                            <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-emerald-500 rounded-full"></div>
                        </div>
                        <Volume2 className="h-4 w-4 text-slate-400" />
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TranscriptMessage({ role, text }: { role: 'user' | 'assistant'; text: string }) {
    const isAssistant = role === 'assistant';
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
