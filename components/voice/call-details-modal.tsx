"use client";

import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw,
    Volume2, X, Phone, Clock, DollarSign, Calendar, Download,
    Maximize2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";

interface CallDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    call: any;
}

export function CallDetailsModal({ open, onOpenChange, call }: CallDetailsModalProps) {
    const [fullCall, setFullCall] = useState<any>(null);
    const [localLoading, setLocalLoading] = useState(false);

    // Audio Player State
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);

    useEffect(() => {
        if (open && call?.id) {
            setFullCall(call);
            setLocalLoading(true);
            fetch(`/api/calls/${call.id}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) setFullCall(data);
                })
                .catch(err => console.error("Error fetching details", err))
                .finally(() => setLocalLoading(false));
        } else {
            // Reset player when closed
            setIsPlaying(false);
            setCurrentTime(0);
            if (audioRef.current) audioRef.current.pause();
        }
    }, [open, call]);

    if (!call) return null;

    const displayCall = fullCall || call;

    const getMessages = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data.transcript) && data.transcript.length > 0) {
            return data.transcript.map((msg: any) => ({
                role: msg.role === 'agent' ? 'assistant' : 'user',
                message: msg.message || msg.content || msg.text
            }));
        }
        if (Array.isArray(data.messages)) return data.messages;
        if (data.analysis && Array.isArray(data.analysis.transcript)) return data.analysis.transcript;
        if (typeof data.transcript === 'string') return [{ role: 'assistant', message: data.transcript }];
        return [];
    };

    const messages = getMessages(displayCall);
    const recordingUrl = displayCall.audio_url || displayCall.recordingUrl || displayCall.recording_url || displayCall.artifact?.recordingUrl;

    const getDurationDisplay = (data: any) => {
        let seconds = 0;
        if (typeof data.call_duration_secs === 'number') seconds = data.call_duration_secs;
        else if (data.analysis?.call_duration_secs) seconds = data.analysis.call_duration_secs;
        else if (typeof data.durationSeconds === 'number') seconds = data.durationSeconds;
        else if (typeof data.duration === 'number') seconds = data.duration;

        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}m ${sec}s`;
    };

    const durationDisplay = getDurationDisplay(displayCall);
    const costDisplay = displayCall.cost || (displayCall.metadata?.cost ? `${displayCall.metadata.cost} credits` : '$0.00');

    // Player Handlers
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const seek = (val: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = val;
            setCurrentTime(val);
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    const changeSpeed = (rate: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
            setPlaybackRate(rate);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden bg-[#0A0C10] border-slate-800 text-slate-100 flex flex-col rounded-[2rem] shadow-2xl ring-1 ring-white/10">
                {/* Custom Header Bar */}
                <div className="absolute right-6 top-6 z-50 flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-white/10 text-slate-400 h-10 w-10">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Hero Header Section */}
                    <div className="p-10 pb-6 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                            <Avatar className="w-24 h-24 border-2 border-white/10 shadow-2xl relative z-10 rounded-3xl overflow-hidden">
                                <AvatarFallback className="bg-slate-900 text-primary text-3xl font-bold italic">
                                    {displayCall.name?.charAt(0) || "G"}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 text-center md:text-left z-10">
                            <h2 className="text-4xl font-black tracking-tighter text-white mb-2 flex items-center justify-center md:justify-start gap-4">
                                {displayCall.name || "Guest Caller"}
                                {displayCall.status === 'answered' && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                            </h2>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mt-1">
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-none px-4 rounded-full font-bold">
                                    <Phone className="w-3.5 h-3.5 mr-2" /> {displayCall.phone || "Hidden"}
                                </Badge>
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none px-4 rounded-full font-bold">
                                    <Clock className="w-3.5 h-3.5 mr-2" /> {durationDisplay}
                                </Badge>
                                <Badge variant="secondary" className={`px-4 rounded-full font-black uppercase text-[10px] tracking-widest ${displayCall.isInbound ? 'bg-indigo-500/20 text-indigo-300' : 'bg-orange-500/20 text-orange-300'
                                    }`}>
                                    {displayCall.type || (displayCall.isInbound ? "Inbound" : "Outbound")}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-right z-10">
                            <div className="text-4xl font-black text-white flex items-center gap-2 tracking-tighter">
                                <span className="text-emerald-500 shrink-0">$</span>
                                {costDisplay.replace('$', '')}
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(displayCall.startedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden px-4 md:px-0">
                        {/* Conversation Transcript Area */}
                        <div className="md:col-span-8 flex flex-col overflow-hidden bg-white/2 border-r border-white/5">
                            <ScrollArea className="flex-1 px-10 py-6">
                                <div className="space-y-8 pb-10">
                                    {localLoading && messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-32 gap-6">
                                            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-lg" />
                                            <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Decrypting Transcript...</p>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center py-32 text-slate-500 flex flex-col items-center gap-6">
                                            <div className="w-20 h-20 rounded-full bg-slate-900/50 flex items-center justify-center border border-white/5 shadow-2xl">
                                                <X className="w-10 h-10 text-slate-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-lg font-bold text-slate-300">Transcript Unavailable</p>
                                                <p className="text-xs text-slate-500">The server hasn't generated a text log for this session yet.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((m: any, i: number) => (
                                            <div key={i} className={`flex flex-col ${m.role === 'assistant' ? 'items-start' : 'items-end'} group`}>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 ${m.role === 'assistant' ? 'text-blue-500' : 'text-slate-500'
                                                    }`}>
                                                    {m.role === 'assistant' ? 'AI Assistant' : 'Caller'}
                                                </span>
                                                <div className={`p-6 rounded-[2rem] max-w-[85%] text-sm md:text-base leading-[1.6] shadow-2xl transition-all duration-300 border ${m.role === 'assistant'
                                                        ? 'bg-slate-900 border-white/5 text-slate-100 rounded-tl-none ring-1 ring-white/5'
                                                        : 'bg-primary/20 border-primary/20 text-white rounded-tr-none text-right ring-1 ring-primary/20'
                                                    }`}>
                                                    {m.message}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Analysis Sidebar */}
                        <div className="md:col-span-4 p-8 overflow-y-auto bg-black/40">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Advanced Summary
                                    </h3>
                                    <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <Maximize2 className="w-4 h-4 cursor-pointer" />
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                            {displayCall.analysis?.summary || displayCall.summary || "Generating AI summary..."}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="bg-white/5" />

                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "Status", value: displayCall.status, color: "text-emerald-400" },
                                        { label: "Source", value: displayCall.source, color: "text-blue-400" },
                                        { label: "Country", value: displayCall.country || "GLOBAL", color: "text-purple-400" },
                                        { label: "Latency", value: displayCall.metadata?.latency ? `${displayCall.metadata.latency}ms` : "LOW", color: "text-amber-400" }
                                    ].map((field, idx) => (
                                        <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{field.label}</p>
                                            <p className={`text-sm font-bold capitalize ${field.color}`}>{field.value || "—"}</p>
                                        </div>
                                    ))}
                                </div>

                                <Separator className="bg-white/5" />

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Quick Actions
                                    </h3>
                                    <Button asChild variant="outline" className="w-full h-14 rounded-2xl bg-slate-900 border-white/10 hover:bg-white/5 text-slate-300 gap-3 text-sm font-bold">
                                        <a href={recordingUrl} download target="_blank">
                                            <Download className="w-5 h-5 text-emerald-500" /> Download High-res Recording
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PREMIUM FLOATING PLAYER --- */}
                {recordingUrl && (
                    <div className="h-32 bg-slate-900/95 backdrop-blur-3xl border-t border-white/10 px-8 flex items-center gap-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[60]">
                        <audio
                            ref={audioRef}
                            src={recordingUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => setIsPlaying(false)}
                        />

                        {/* Playback Controls */}
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="rounded-full hover:bg-white/10 text-slate-400 h-12 w-12 transition-transform active:scale-90">
                                <RotateCcw className="w-6 h-6" />
                            </Button>

                            <Button
                                onClick={togglePlay}
                                className="w-16 h-16 rounded-full bg-white hover:bg-slate-200 text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300 active:scale-95 p-0"
                            >
                                {isPlaying ? <Pause className="fill-current w-8 h-8" /> : <Play className="fill-current w-8 h-8 translate-x-0.5" />}
                            </Button>

                            <Button variant="ghost" size="icon" onClick={() => skip(10)} className="rounded-full hover:bg-white/10 text-slate-400 h-12 w-12 transition-transform active:scale-90">
                                <RotateCw className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Progress Engine */}
                        <div className="flex-1 flex flex-col gap-2 relative">
                            <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                                <span>{formatTime(currentTime)}</span>
                                <span className="text-white/40">{formatTime(duration)}</span>
                            </div>

                            <div className="relative group h-10 flex items-center">
                                {/* Track Container */}
                                <div className="absolute inset-0 h-2 bg-white/5 rounded-full my-auto overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-primary shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all ease-linear"
                                        style={{ width: `${(currentTime / duration || 0) * 100}%` }}
                                    />
                                </div>

                                {/* Invisible Range Input */}
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    step="0.01"
                                    value={currentTime}
                                    onChange={(e) => seek(parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                />

                                {/* Refined Thumb */}
                                <div
                                    className="absolute h-5 w-5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] border-[3px] border-primary pointer-events-none transition-transform group-hover:scale-125 z-20"
                                    style={{ left: `calc(${(currentTime / duration || 0) * 100}% - 10px)` }}
                                />
                            </div>
                        </div>

                        {/* Speed Matrix */}
                        <div className="flex items-center gap-6 border-l border-white/10 pl-10 h-full">
                            <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5 self-center">
                                {[0.5, 1, 1.5, 2].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => changeSpeed(rate)}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all duration-300 uppercase tracking-tighter ${playbackRate === rate ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'
                                            }`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>

                            <Button size="icon" variant="ghost" className="rounded-full text-slate-500 hover:text-white hover:bg-white/10" onClick={() => setVolume(volume === 0 ? 1 : 0)}>
                                <Volume2 className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
