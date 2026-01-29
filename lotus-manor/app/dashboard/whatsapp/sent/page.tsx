"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCheck, Clock, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const messages = [
    { id: 1, recipient: "+971 50 123 4567", message: "Hello! Welcome to Lotus Manor. How can we help you today?", status: "Read", time: "10:30 AM" },
    { id: 2, recipient: "+971 50 987 6543", message: "Reminder: Your appointment is scheduled for tomorrow at 2 PM.", status: "Delivered", time: "09:15 AM" },
    { id: 3, recipient: "+971 55 444 3333", message: "Thank you for your inquiry. Our agent will contact you shortly.", status: "Failed", time: "昨天 04:45 PM" },
    { id: 4, recipient: "+971 56 777 8888", message: "Exclusive offer: Get 20% off on your first consultation!", status: "Sent", time: "昨天 11:20 AM" },
];

export default function WhatsappSentPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Total Sent Messages</h1>
                    <p className="text-slate-500">History of all outbound WhatsApp communications</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Sent" value="1,248" icon={<Send className="h-4 w-4" />} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="Delivered" value="1,112" icon={<CheckCheck className="h-4 w-4" />} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard title="Read" value="845" icon={<CheckCheck className="h-4 w-4 text-blue-500" />} color="text-amber-600" bg="bg-amber-50" />
                <StatCard title="Failed" value="24" icon={<XCircle className="h-4 w-4" />} color="text-rose-600" bg="bg-rose-50" />
            </div>

            <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-lg">Message History</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input className="pl-10 h-9" placeholder="Search recipients..." />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {messages.map((msg) => (
                            <div key={msg.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-950">{msg.recipient}</p>
                                    <p className="text-sm text-slate-600 max-w-xl">{msg.message}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{msg.time}</span>
                                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${msg.status === 'Read' ? 'text-blue-500' :
                                                msg.status === 'Delivered' ? 'text-emerald-500' :
                                                    msg.status === 'Failed' ? 'text-rose-500' : 'text-slate-400'
                                            }`}>
                                            {msg.status === 'Read' && <CheckCheck className="h-3 w-3" />}
                                            {msg.status === 'Delivered' && <CheckCheck className="h-3 w-3" />}
                                            {msg.status === 'Sent' && <Clock className="h-3 w-3" />}
                                            {msg.status === 'Failed' && <XCircle className="h-3 w-3" />}
                                            {msg.status}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Details</Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, icon, color, bg }: any) {
    return (
        <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-lg ${bg} ${color}`}>{icon}</div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
