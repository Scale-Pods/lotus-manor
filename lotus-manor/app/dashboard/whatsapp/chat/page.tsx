"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    Filter,
    Users,
    Send,
    MessageCircle,
    MessageSquare,
    RefreshCw,
    PieChart,
    BarChart3,
    ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import React from "react";

export default function WhatsappChatPage() {
    return (
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">WhatsApp Chats</h1>
                    
                </div>
                
            </div>

            {/* Overview Metrics & Message Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overview Metrics Cards (2/3 width) */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Leads"
                        value="1076"
                        desc="All customers"
                        icon={Users}
                    />
                    <MetricCard
                        title="Templates Sent"
                        value="114"
                        desc="10.6% of leads"
                        icon={Send}
                        detail="T1: 103, T2: 11"
                    />
                    <MetricCard
                        title="Message Delivery"
                        value="32"
                        desc="Read Messages"
                        icon={MessageCircle}
                        dots={{ delivered: 3, read: 32, failed: 28 }}
                    />
                    <MetricCard
                        title="Replies"
                        value="3"
                        desc="0.0% response"
                        icon={MessageSquare}
                    />
                </div>

                {/* Message Status Bar (1/3 width) */}
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-4 space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Message Status Overview</h3>
                            <p className="text-xs text-slate-500">Status after delivery</p>
                        </div>
                        <div className="space-y-3">
                            <StatusBar label="Accepted" value={0} total={100} color="bg-slate-300" />
                            <StatusBar label="Delivered" value={3} total={100} color="bg-slate-400" />
                            <StatusBar label="Read" value={32} total={100} color="bg-emerald-500" />
                            <StatusBar label="Failed" value={28} total={100} color="bg-rose-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Panel (Left) */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-slate-200 shadow-sm bg-white h-auto">
                        <CardContent className="p-4 space-y-6">
                            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                                <Filter className="h-4 w-4" /> Filters
                            </div>

                            <FilterSection title="Status">
                                <FilterOption label="Hot" color="text-rose-500" />
                                <FilterOption label="Warm" color="text-orange-500" />
                                <FilterOption label="Cold" color="text-blue-500" />
                            </FilterSection>

                            <FilterSection title="Meeting">
                                <FilterOption label="Booked" />
                                <FilterOption label="Not Booked" />
                            </FilterSection>

                            <FilterSection title="Message Status">
                                <FilterOption label="Accepted" />
                                <FilterOption label="Delivered" />
                                <FilterOption label="Read" />
                                <FilterOption label="Failed" />
                            </FilterSection>

                            <FilterSection title="Template">
                                <FilterOption label="T1" />
                                <FilterOption label="T2" />
                                <FilterOption label="T3" />
                                <FilterOption label="None" />
                            </FilterSection>
                        </CardContent>
                    </Card>
                </div>

                {/* Customers Table (Right) */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input className="pl-10 bg-white" placeholder="Search by company name, phone number, or summary..." />
                    </div>

                    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100"><div className="flex items-center gap-1">Company <ArrowUpDown className="h-3 w-3" /></div></th>
                                    <th className="px-4 py-3">Lead Status</th>
                                    <th className="px-4 py-3">Templates</th>
                                    <th className="px-4 py-3">Messages</th>
                                    <th className="px-4 py-3">Msg Status</th>
                                    <th className="px-4 py-3">Meeting</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <CustomerRow
                                    id="1"
                                    company="2 smart look salon"
                                    phone="971545612111"
                                    templates={['T1', 'T2', 'T3']}
                                />
                                <CustomerRow
                                    id="2"
                                    company="5 AED Gents Salon"
                                    phone="971569388058"
                                    templates={['T1', 'T2', 'T3']}
                                />
                                <CustomerRow
                                    id="3"
                                    company="700 Gents Salon"
                                    phone="971554452328"
                                    templates={['T1', 'T2', 'T3']}
                                    t1Sent
                                />
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, desc, icon: Icon, detail, dots }: any) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                <p className="text-xs font-medium text-slate-500">{title}</p>
                <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
                {detail && <div className="mt-2 text-[10px] bg-slate-50 p-1 rounded text-slate-600">{detail}</div>}
                {dots && (
                    <div className="flex gap-1 mt-2">
                        <div className="h-2 w-2 rounded-full bg-blue-400" title={`Delivered: ${dots.delivered}`} />
                        <div className="h-2 w-2 rounded-full bg-emerald-500" title={`Read: ${dots.read}`} />
                        <div className="h-2 w-2 rounded-full bg-rose-500" title={`Failed: ${dots.failed}`} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function StatusBar({ label, value, total, color }: any) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-slate-600">
                <span>{label}</span>
                <span>{value} ({((value / total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${(value / total) * 100}%` }} />
            </div>
        </div>
    );
}

function FilterSection({ title, children }: any) {
    return (
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400">{title}</h4>
            <div className="space-y-1.5">
                {children}
            </div>
        </div>
    );
}

function FilterOption({ label, color }: any) {
    return (
        <div className="flex items-center gap-2">
            <Checkbox id={label} className="h-3.5 w-3.5 border-slate-300" />
            <label htmlFor={label} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${color || 'text-slate-600'}`}>
                {label}
            </label>
        </div>
    );
}

function CustomerRow({ id, company, phone, templates, t1Sent }: any) {
    return (
        <tr className="hover:bg-slate-50 transition-colors cursor-pointer group">
            <td className="px-4 py-3">
                <Link href={`/dashboard/whatsapp/chat/${id}`} className="block">
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700">{company}</div>
                    <div className="text-xs text-slate-500">{phone}</div>
                </Link>
            </td>
            <td className="px-4 py-3 text-slate-400 text-xs">—</td>
            <td className="px-4 py-3">
                <div className="flex gap-1">
                    {templates.map((t: string) => (
                        <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${t === 'T1' && t1Sent ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            {t}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-4 py-3 text-slate-400 text-xs">—</td>
            <td className="px-4 py-3 text-slate-400 text-xs">No status</td>
            <td className="px-4 py-3 text-slate-400 text-xs">—</td>
        </tr>
    );
}
