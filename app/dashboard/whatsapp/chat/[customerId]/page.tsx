"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    RefreshCw,
    Download,
    FileJson,
    ExternalLink,
    MapPin,
    Globe,
    MessageSquare,
    User,
    Bot,
    Send
} from "lucide-react";
import Link from "next/link";

export default function CustomerDetailPage({ params }: { params: { customerId: string } }) {
    // In a real app, fetch customer data using params.customerId

    return (
        <div className="space-y-6 pb-10 h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/whatsapp/chat">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                            <ChevronLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Amira Secret Beauty Salon</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Beauty salon</span>
                            <span>•</span>
                            <span>Dubai (cached)</span>
                        </div>
                    </div>
                </div>
                
            </div>

            {/* Main Content - Flex Grow to fill height if needed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grow overflow-hidden">
                {/* Left Column: Messages Stream (2/3 width) */}
                <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
                    {/* Template Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Template Messages</h3>

                            {/* Template 1 */}
                            <Card className="border-slate-200 shadow-sm bg-white">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-slate-200">Template 1</Badge>
                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">⚠️ Delivery Limited</Badge>
                                    </div>
                                    <div className="text-sm text-slate-700 space-y-2 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <p>"Hello Amira Secret Beauty Salon,"</p>
                                        <p>"Yash here, founder of Serviots."</p>
                                        <p>...[Full pitch message content]...</p>
                                        <p>"Serviots, Powered by Scalepods"</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right">Sent: 2025-12-28T16:25:29.338+04:00</p>
                                </CardContent>
                            </Card>

                            {/* Template 2 */}
                            <Card className="border-slate-200 shadow-sm bg-white">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-slate-200">Template 2</Badge>
                                    </div>
                                    <div className="text-sm text-slate-700 space-y-2 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <p>"Hello Amira Secret Beauty Salon, checking back on this."</p>
                                        <p>...[Follow up message content]...</p>
                                        <p>"Serviots, Powered by Scalepods"</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right">Sent: 2026-01-12T11:46:46.329+04:00</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Conversation Timeline */}
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900">Conversation Timeline</h3>
                                <span className="text-xs text-slate-500">0 messages • 0 from customer • 0 from bot</span>
                            </div>

                            {/* Empty State */}
                            <div className="h-40 flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm font-medium">No messages yet</p>
                                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 gap-2">
                                    <Send className="h-4 w-4" /> Send First Message
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Info & Stats (1/3 width) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Contact Info */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-4 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500">Phone</span>
                                    <span className="font-medium text-slate-900">+971 50 123 4567</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500">Location</span>
                                    <div className="flex items-center gap-1 font-medium text-slate-900">
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                        Dubai (AE)
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500">Website</span>
                                    <div className="flex items-center gap-1 font-medium text-emerald-600">
                                        <Globe className="h-3 w-3" />
                                        <a href="#" className="hover:underline">amirabeautysalon.com</a>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-4 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900">Message Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <StatBox label="Total" value="0" icon={MessageSquare} />
                                <StatBox label="Customer" value="0" icon={User} />
                                <StatBox label="Bot" value="0" icon={Bot} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Raw Data */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900">Raw Data</h3>
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-emerald-600 hover:text-emerald-700">Show</Button>
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
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
            <Icon className="h-4 w-4 text-slate-400 mb-1" />
            <span className="text-lg font-bold text-slate-900">{value}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
        </div>
    );
}
