"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Mic, ExternalLink, Copy, Eye, EyeOff, ShieldCheck, Wallet } from "lucide-react";
import React, { useState } from "react";

export default function CredentialsPage() {
    return (
        <div className="space-y-8 pb-10 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Credentials Management</h1>
                    <p className="text-slate-500">View your active integrations and manageable accounts.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Email Section */}
                <CredentialSection
                    title="Email Integration"
                    description="Connected Gmail/SMTP accounts for outreach."
                    icon={Mail}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50"
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <ReadOnlyField label="Connected Email" value="aditya@lotusmanor.com" />
                        <ReadOnlyField label="App Password" value="abcdefgh" isPassword />
                        <ReadOnlyField label="SMTP Host" value="smtp.gmail.com" />
                        <ReadOnlyField label="SMTP Port" value="587" />
                    </div>
                </CredentialSection>

                {/* WhatsApp Section */}
                <CredentialSection
                    title="WhatsApp Business API"
                    description="Meta Business API credentials for WhatsApp CRM."
                    icon={MessageCircle}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <ReadOnlyField label="Phone Number ID" value="10xxxxx" />
                        <ReadOnlyField label="WhatsApp Business Account ID" value="1xxxxxxxx" />
                        <div className="md:col-span-2">
                            <ReadOnlyField label="Permanent Access Token" value="EAAG..." isPassword />
                        </div>
                    </div>
                </CredentialSection>

                {/* Voice Section */}
                <CredentialSection
                    title="Voice Agent (Vapi)"
                    description="Vapi.ai credentials and wallet management."
                    icon={Mic}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                    action={
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => window.open('https://dashboard.vapi.ai/billing', '_blank')}>
                            <Wallet className="h-4 w-4" />
                            Add Funds
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <ReadOnlyField label="Public Key" value="8f92-xxxx-xxxx-xxxx" />
                            <ReadOnlyField label="Private API Key" value="sk-vapi-..." isPassword />
                        </div>

                        {/* Wallet Status Preview */}
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-md border border-slate-200">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Active Subscription</p>
                                    <p className="text-xs text-slate-500">Pro Plan (Tier 1)</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Balance</p>
                                <p className="text-xl font-bold text-slate-900">$12.50</p>
                            </div>
                        </div>
                    </div>
                </CredentialSection>
            </div>
        </div>
    );
}

function CredentialSection({ title, description, icon: Icon, iconColor, iconBg, children, action }: any) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
                            <Icon className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
                            <CardDescription className="mt-1">{description}</CardDescription>
                        </div>
                    </div>
                    {action && <div>{action}</div>}
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {children}
            </CardContent>
        </Card>
    );
}

function ReadOnlyField({ label, value, isPassword }: { label: string, value: string, isPassword?: boolean }) {
    const [show, setShow] = useState(false);

    // Simple masking logic
    const displayValue = isPassword && !show
        ? "••••••••••••••••••••••••"
        : value;

    return (
        <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</Label>
            <div className="relative group">
                <div className="flex items-center w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm">
                    <span className={`flex-1 truncate ${isPassword && !show ? 'font-mono tracking-widest' : 'font-sans'}`}>
                        {displayValue}
                    </span>
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isPassword && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600" onClick={() => setShow(!show)}>
                                {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-slate-600"
                            onClick={() => navigator.clipboard.writeText(value)}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
