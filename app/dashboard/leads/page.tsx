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
import { Users, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Lead {
    name: string;
    phone: number;
    email: string;
    replied: string;
    current_loop: string;
    stages_passed: string[];
}

const STAGES = [
    { id: 1, label: "Stage 1", criteria: ["Email 1", "WhatsApp 1"] },
    { id: 2, label: "Stage 2", criteria: ["WhatsApp 2"] },
    { id: 3, label: "Stage 3", criteria: ["Email 2"] },
    { id: 4, label: "Stage 4", criteria: ["Email 3"] },
    { id: 5, label: "Stage 5", criteria: ["Voice 1"] },
    { id: 6, label: "Stage 6", criteria: ["Voice 2"] },
];

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/leads");
            if (!response.ok) {
                throw new Error("Failed to fetch leads");
            }
            const data = await response.json();
            setLeads(data);
        } catch (err) {
            console.error(err);
            setError("Could not load leads data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const calculateProgress = (stagesPassed: string[]) => {
        let completedStages = 0;

        // Normalize stagesPassed to check for inclusion easily
        // Sometimes the API might return "Email 1" or "email 1", let's assume case sensitive from JSON example but be careful.
        // JSON example: "stages_passed": ["WhatsApp 1", "Email 1"]

        // We will check strictly for now based on the user's prompt mapping.
        // However, the user said "stage 1 (email 1 +whatsapp1)".
        // If stages_passed contains EITHER, does it count? Or BOTH? 
        // Usually "stages_passed" implies completion. 
        // Let's iterate through our DEFINED stages and see if the user has passed them.

        // Logic: A stage is "passed" if ANY of its criteria is in the `stages_passed` array?
        // Or if ALL criteria are in it? 
        // List: ["WhatsApp 1", "Email 1"] -> Stage 1. 
        // List: ["WhatsApp 2"] -> Stage 2.

        // Let's assume if ANY of the criteria for a stage appears in `stages_passed`, that stage is considered processed/passed.

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

    const getStageLabel = (stagesPassed: string[]) => {
        // Find the highest stage passed
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
                    <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <div className="bg-white p-2 rounded-md border shadow-sm text-sm font-medium text-slate-600">
                        Total Leads: {leads.length}
                    </div>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <CardTitle>All Leads</CardTitle>
                    </div>
                    <CardDescription>
                        Real-time data from your Intro and Follow-up loops.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[200px]">Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Current Loop</TableHead>
                                <TableHead>Replied</TableHead>
                                <TableHead className="w-[250px]">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                        No leads found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leads.map((lead, index) => {
                                    const progress = calculateProgress(lead.stages_passed || []);
                                    const stageLabel = getStageLabel(lead.stages_passed || []);

                                    return (
                                        <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-medium text-slate-900">{lead.name}</TableCell>
                                            <TableCell className="text-slate-600">{lead.phone}</TableCell>
                                            <TableCell className="text-slate-600">{lead.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                                                    {lead.current_loop}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={lead.replied === "Yes" ? "default" : "secondary"}
                                                    className={lead.replied === "Yes" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none" : ""}>
                                                    {lead.replied}
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
                </CardContent>
            </Card>
        </div>
    );
}
