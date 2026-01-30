"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    Filter,
    Download,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    FileSpreadsheet,
    ArrowUpDown,
    Calendar,
    Briefcase
} from "lucide-react";
import React, { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const leads = [
    { id: 1, name: "Akshitha O", company: "rugr", position: "Director, Sales", email: "akshitha@rugr.com", phone: "919035076409", status: "Unknown", scanned: "1/29/2026, 3:17:35 PM" },
    { id: 2, name: "Atul Pal", company: "videosdk", position: "Associate Director Of Sales", email: "Atul@videosdk.live", phone: "919901819354", status: "Unknown", scanned: "1/29/2026, 3:17:35 PM" },
    { id: 3, name: "Devyani Gupta", company: "arrowhead", position: "CEO", email: "devyani@arrowhead.team", phone: "918425093357", status: "Unknown", scanned: "1/29/2026, 3:17:35 PM" },
    { id: 4, name: "Chaitanya Aneja", company: "aisensy", position: "Sr. Manager - Business Development", email: "chaitanya.aneja@aisensy.com", phone: "918810214085", status: "Unknown", scanned: "1/29/2026, 3:17:35 PM" },
    { id: 5, name: "Piyush Srivastava", company: "befisc", position: "Associate Account Manager", email: "piyush@befisc.com", phone: "919650159336", status: "Unknown", scanned: "1/29/2026, 3:17:35 PM" },
];

export default function WhatsappLeadsPage() {
    const [selectedLeads, setSelectedLeads] = useState<number[]>([]);

    const toggleSelectAll = () => {
        if (selectedLeads.length === leads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(selectedLeads.filter(l => l !== id));
        } else {
            setSelectedLeads([...selectedLeads, id]);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Leads</h1>
                    <p className="text-slate-500">Click on any column header to analyze that field</p>
                </div>
                <DateRangePicker />
            </div>

            {/* Status Filter Section */}
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <h3 className="text-lg font-bold">Leads by Status</h3>
                    <p className="text-purple-100 text-sm">Click on any status to view those leads</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatusCard title="REPLIED" value="19" borderColor="border-emerald-500" accentColor="text-emerald-400" />
                    <StatusCard title="WAITING FOR REPLY" value="4" borderColor="border-orange-500" accentColor="text-orange-400" />
                    <StatusCard title="NURTURE EMAIL SENT" value="0" borderColor="border-amber-700" accentColor="text-amber-600" />
                    <StatusCard title="UNRESPONSIVE" value="0" borderColor="border-red-500" accentColor="text-red-400" />
                </div>
            </div>

            {/* Search & Bulk Actions Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10" placeholder="Search leads by name, company, or email..." />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Button variant="outline" className="gap-2 whitespace-nowrap">
                        <Filter className="h-4 w-4" /> All Campaigns
                    </Button>
                    <Button variant="outline" className="gap-2 whitespace-nowrap">
                        <Briefcase className="h-4 w-4" /> All Companies
                    </Button>
                    <Button variant="outline" className="gap-2 whitespace-nowrap">
                        <Calendar className="h-4 w-4" /> Date Range
                    </Button>
                </div>
            </div>

            {/* Bulk Action Context Header */}
            {selectedLeads.length > 0 && (
                <div className="bg-white border border-emerald-100 p-3 rounded-lg flex items-center justify-between shadow-sm">
                    <span className="text-sm font-bold text-slate-700">{selectedLeads.length} leads selected</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 border-slate-200 text-slate-600 hover:text-slate-900">Send Message</Button>
                        <Button size="sm" variant="outline" className="h-8 border-slate-200 text-slate-600 hover:text-slate-900">Change Status</Button>
                        <Button size="sm" variant="destructive" className="h-8">Delete</Button>
                    </div>
                </div>
            )}

            {/* Leads Table */}
            <Card className="border-slate-200 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                                    <th className="px-4 py-4 w-[40px]">
                                        <Checkbox
                                            checked={selectedLeads.length === leads.length && leads.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Company <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Position <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Email <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Phone <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 group">
                                        <div className="flex items-center gap-1">Scanned <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" /></div>
                                    </th>
                                    <th className="px-4 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                        <td className="px-4 py-4">
                                            <Checkbox
                                                checked={selectedLeads.includes(lead.id)}
                                                onCheckedChange={() => toggleSelect(lead.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-900">{lead.name}</td>
                                        <td className="px-4 py-4 text-slate-600">{lead.company}</td>
                                        <td className="px-4 py-4 text-slate-600 max-w-[150px] truncate" title={lead.position}>{lead.position}</td>
                                        <td className="px-4 py-4 text-slate-600">{lead.email}</td>
                                        <td className="px-4 py-4 text-slate-600 font-mono text-xs">{lead.phone}</td>
                                        <td className="px-4 py-4">
                                            <StatusBadge status={lead.status} />
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">{lead.scanned}</td>
                                        <td className="px-4 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-slate-600">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem>Send Message</DropdownMenuItem>
                                                    <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">Delete Lead</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">1-5</span> of 10 recent leads</p>
                        <Button variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-2 font-medium">
                            <FileSpreadsheet className="h-4 w-4" /> View Full Sheet
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatusCard({ title, value, borderColor, accentColor }: any) {
    return (
        <Card className={`bg-white border-l-4 ${borderColor} border-y border-r border-slate-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all`}>
            <CardContent className="p-4">
                <p className={`text-xs font-bold uppercase tracking-wider ${accentColor} mb-1`}>{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>

            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    let classes = "bg-slate-100 text-slate-600";
    if (status === 'Unknown') classes = "bg-blue-100 text-blue-700";
    if (status === 'Replied') classes = "bg-emerald-100 text-emerald-700";
    if (status === 'Waiting') classes = "bg-orange-100 text-orange-700";
    if (status === 'Unresponsive') classes = "bg-red-100 text-red-700";

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${classes}`}>
            {status}
        </span>
    );
}
