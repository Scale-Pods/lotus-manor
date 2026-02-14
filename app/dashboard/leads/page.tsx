"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, Loader2, RefreshCw, Mail, MessageCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { consolidateLeads } from "@/lib/leads-utils";

interface Lead {
    id?: string;
    name: string;
    phone: string;
    email: string;
    replied: string;
    email_replied?: string;
    whatsapp_replied?: string;
    current_loop: string;
    stages_passed: string[];
    lead_id?: string;
    current_week?: string;
    display_loop?: string;
    source_loop?: string;
}

const STAGES = [
    { id: 1, label: "Stage 1", criteria: ["Email 1", "WhatsApp 1"] },
    { id: 2, label: "Stage 2", criteria: ["WhatsApp 2"] },
    { id: 3, label: "Stage 3", criteria: ["Email 2"] },
    { id: 4, label: "Stage 4", criteria: ["Email 3"] },
    { id: 5, label: "Stage 5", criteria: ["Voice 1"] },
    { id: 6, label: "Stage 6", criteria: ["Voice 2"] },
    { id: 7, label: "Stage 7", criteria: ["FollowUp 48 Hr"] },
];

const NURTURE_WEEK_STEPS = ["WhatsApp 1", "Email 1", "WhatsApp 2", "Voice 1", "Voice 2", "Email 1", "Email 2"];

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"leads" | "templates">("leads");
    const [templateFilter, setTemplateFilter] = useState<"email" | "whatsapp">("email");
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/leads");
            if (!response.ok) {
                throw new Error(`Failed to fetch leads: ${response.statusText}`);
            }
            const data = await response.json();

            // Check for API-level errors
            if (data.error) {
                throw new Error(data.error);
            }

            // Consolidate the leads from all tables
            const flattenedLeads = consolidateLeads(data);
            console.log(`Successfully fetched and consolidated ${flattenedLeads.length} leads.`);
            setLeads(flattenedLeads);
        } catch (err: any) {
            console.error("Leads fetch error:", err);
            setError(err.message || "Could not load leads data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/templates");
            if (!response.ok) {
                throw new Error("Failed to fetch templates");
            }
            const data = await response.json();
            setTemplates(data);
        } catch (err) {
            console.error(err);
            setError("Could not load templates. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === "leads") {
            fetchLeads();
        } else {
            fetchTemplates();
        }
    }, [view]);

    const calculateProgress = (lead: Lead) => {
        const stagesPassed = lead.stages_passed || [];

        // Nurture Loop Logic
        if (lead.source_loop === "nurture") {
            let weekNum = 1;
            if (lead.current_week) {
                const match = lead.current_week.match(/Week (\d+)/i);
                if (match) weekNum = parseInt(match[1]);
            }

            const TOTAL_NURTURE_WEEKS = 3;
            if (weekNum > TOTAL_NURTURE_WEEKS) weekNum = TOTAL_NURTURE_WEEKS;

            const nurtureSteps = ["WhatsApp 1", "Email 1", "WhatsApp 2", "Voice 1", "Voice 2", "Email 2"];
            const completedStepsCount = nurtureSteps.filter(step => stagesPassed.includes(step)).length;
            const weekProgress = completedStepsCount / nurtureSteps.length;

            const baseProgress = ((weekNum - 1) / TOTAL_NURTURE_WEEKS);
            const currentWeekContribution = (weekProgress / TOTAL_NURTURE_WEEKS);

            return (baseProgress + currentWeekContribution) * 100;
        }

        // Original Logic (Intro/FollowUp)
        let completedStages = 0;
        for (const stage of STAGES) {
            const hasPassedStage = stage.criteria.some(criterion =>
                stagesPassed.includes(criterion)
            );
            if (hasPassedStage) {
                completedStages++;
            }
        }
        return (completedStages / STAGES.length) * 100;
    };

    const getStageLabel = (lead: Lead) => {
        const stagesPassed = lead.stages_passed || [];

        if (lead.source_loop === "nurture") {
            if (lead.current_week) {
                const match = lead.current_week.match(/Week (\d+)/i);
                if (match) return `Stage ${match[1]}`;
                return lead.current_week;
            }
            return "Nurture";
        }

        let highestStage = 0;
        for (const stage of STAGES) {
            if (stage.criteria.some(c => stagesPassed.includes(c))) {
                highestStage = stage.id;
            }
        }
        return highestStage > 0 ? `Stage ${highestStage}` : "New";
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
                    <p className="text-slate-500">Manage and track your leads across all loops.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={view === "leads" ? "outline" : "ghost"}
                        onClick={() => setView("leads")}
                        className={view === "leads" ? "bg-slate-50" : ""}
                    >
                        Leads
                    </Button>
                    <Button
                        variant={view === "templates" ? "outline" : "ghost"}
                        onClick={() => setView("templates")}
                        className={view === "templates" ? "bg-slate-50" : ""}
                    >
                        Templates
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => view === "leads" ? fetchLeads() : fetchTemplates()} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <div className="bg-white p-2 rounded-md border shadow-sm text-sm font-medium text-slate-600">
                        {view === "leads" ? `Total Leads: ${leads.length}` : `Templates: ${templates.length}`}
                    </div>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        {view === "leads" ? <Users className="h-5 w-5 text-blue-600" /> : <AlertCircle className="h-5 w-5 text-purple-600" />}
                        <CardTitle>{view === "leads" ? "All Leads" : "Templates Library"}</CardTitle>
                    </div>
                    <CardDescription>
                        {view === "leads" ? "Real-time data from your Intro and Follow-up loops." : "Manage your messaging templates."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {view === "leads" ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead className="w-[200px]">Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-center">Channel</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Current Loop</TableHead>
                                    <TableHead>Reply Status</TableHead>
                                    <TableHead className="w-[250px]">Progress</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading leads...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                            No leads found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    leads.map((lead, index) => {
                                        const progress = calculateProgress(lead);
                                        const stageLabel = getStageLabel(lead);

                                        return (
                                            <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-900">{lead.name}</TableCell>
                                                <TableCell className="text-slate-600">{lead.phone}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {lead.email && lead.email !== "No Email" && (
                                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 text-[10px] font-medium h-5 px-1.5 w-full justify-center">
                                                                Email
                                                            </Badge>
                                                        )}
                                                        {lead.phone && (
                                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 text-[10px] font-medium h-5 px-1.5 w-full justify-center">
                                                                WhatsApp
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`text-sm ${lead.email === "No Email" ? "text-slate-300 italic" : "text-slate-600"}`}>
                                                    {lead.email === "No Email" ? "No Email" : lead.email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 uppercase text-[10px] font-bold tracking-wider">
                                                        {lead.source_loop === 'followup' ? 'FOLLOW UP' : lead.source_loop === 'nr_wf' || lead.source_loop === 'Intro' ? 'INTRO' : (lead.display_loop || lead.current_loop || lead.source_loop || "").toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={(lead.replied === "Yes" || (lead.email_replied && lead.email_replied !== "No") || (lead.whatsapp_replied && lead.whatsapp_replied !== "No")) ? "default" : "secondary"}
                                                        className={(lead.replied === "Yes" || (lead.email_replied && lead.email_replied !== "No") || (lead.whatsapp_replied && lead.whatsapp_replied !== "No")) ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none font-bold capitalize" : "capitalize text-slate-500 bg-slate-100"}>
                                                        {(lead.email_replied && lead.email_replied !== "No") ? "Replied" : (lead.whatsapp_replied && lead.whatsapp_replied !== "No") ? "Replied" : lead.replied === "No" ? "Sent" : lead.replied}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1.5 container">
                                                        <div className="flex justify-between text-xs text-slate-500">
                                                            <span>{stageLabel}</span>
                                                            <span>{Math.round(progress)}%</span>
                                                        </div>
                                                        <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-500" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* Template Type Toggles */}
                            <div className="flex justify-center">
                                <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTemplateFilter("email")}
                                        className={`text-xs h-8 px-4 rounded-md transition-all ${templateFilter === "email" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-900"}`}
                                    >
                                        Email Templates
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTemplateFilter("whatsapp")}
                                        className={`text-xs h-8 px-4 rounded-md transition-all ${templateFilter === "whatsapp" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-900"}`}
                                    >
                                        WhatsApp Templates
                                    </Button>
                                </div>
                            </div>

                            {loading && templates.length === 0 ? (
                                <div className="flex items-center justify-center h-24 text-slate-500 gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading templates...
                                </div>
                            ) : templates.filter(t => t.type === templateFilter).length === 0 ? (
                                <div className="text-center text-slate-500 py-10">No {templateFilter} templates found.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                                    {templates.filter(t => t.type === templateFilter).map((template: any, idx) => (
                                        <Card key={template.id || idx} className="border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-md ${template.type === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {template.type === 'email' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                                                    </div>
                                                    <div className="font-semibold text-slate-700">
                                                        {template.name || `Template ${idx + 1}`}
                                                    </div>
                                                </div>
                                                {template.category && (
                                                    <Badge variant="secondary" className="text-xs bg-white border border-slate-200">
                                                        {template.category}
                                                    </Badge>
                                                )}
                                            </CardHeader>
                                            <CardContent className="p-6 bg-white prose prose-slate max-w-none">
                                                <div className="whitespace-pre-wrap text-slate-700 font-sans leading-relaxed">
                                                    {typeof template.body === 'string' ? template.body :
                                                        typeof template.components === 'object' ? JSON.stringify(template.components, null, 2) :
                                                            JSON.stringify(template, null, 2)}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
