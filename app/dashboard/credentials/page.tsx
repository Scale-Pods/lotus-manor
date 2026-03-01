"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Mic, ExternalLink, Copy, Eye, EyeOff, ShieldCheck, Wallet, Phone } from "lucide-react";
import React, { useState } from "react";

export default function CredentialsPage() {
    const [senderEmails, setSenderEmails] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [voiceBalance, setVoiceBalance] = useState<any>(null);

    React.useEffect(() => {
        const fetchEmails = async () => {
            try {
                const res = await fetch('/api/email/warmup-analytics', { method: 'POST' });
                if (!res.ok) throw new Error("Failed to fetch analytics");
                const data = await res.json();

                // Extract emails from the warmup account objects
                if (Array.isArray(data)) {
                    const emails = data.map((account: any) => account.email);
                    setSenderEmails(emails);
                }
            } catch (err) {
                console.error("Error fetching sender emails:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchVoiceBalance = async () => {
            try {
                const res = await fetch('/api/vapi/balance');
                if (res.ok) {
                    const data = await res.json();
                    setVoiceBalance(data);
                }
            } catch (err) {
                console.error("Error fetching voice balance:", err);
            }
        };

        fetchEmails();
        fetchVoiceBalance();
    }, []);

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
                    description="Active sender accounts detected from your campaigns."
                    icon={Mail}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50"
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        {loading ? (
                            <div className="md:col-span-2 text-slate-400 text-sm animate-pulse">Detecting active email accounts...</div>
                        ) : senderEmails.length > 0 ? (
                            senderEmails.map((email, idx) => (
                                <ReadOnlyField key={idx} label={`Project Email ${idx + 1}`} value={email} />
                            ))
                        ) : (
                            <ReadOnlyField label="Connected Email" value="No active emails detected" />
                        )}
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
                        <ReadOnlyField label="Phone Number " value="+971 55 xxx xx74" />
                        <ReadOnlyField label="WhatsApp Business Account ID" value="277xxxxxxxxx4717" />

                    </div>
                </CredentialSection>

                {/* Voice Section */}
                <CredentialSection
                    title="Voice Agent (ElevenLabs)"
                    description="ElevenLabs.io credentials and subscription management."
                    icon={Mic}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                    action={
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => window.open('https://elevenlabs.io/app/subscription', '_blank')}>
                            <Wallet className="h-4 w-4" />
                            Manage Subscription
                        </Button>
                    }
                >
                    <div className="space-y-6">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-md border border-slate-200">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Total Credits (Limit)</p>
                                    <p className="text-xs text-slate-500">
                                        {voiceBalance ? `${voiceBalance.character_limit.toLocaleString()} chars` : 'Loading...'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Remaining Credits</p>
                                <p className="text-xl font-bold text-emerald-600">
                                    {voiceBalance ? `${(voiceBalance.character_limit - voiceBalance.character_count).toLocaleString()}` : '...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CredentialSection>

                {/* Maqsam Section */}
                <CredentialSection
                    title="Maqsam Telephony"
                    description="VoIP and Telephony provider credentials."
                    icon={Phone}
                    iconColor="text-cyan-600"
                    iconBg="bg-cyan-50"
                    action={
                        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
                            <Wallet className="h-4 w-4" />
                            Add Funds
                        </Button>
                    }
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2 bg-slate-50 rounded-lg p-4 border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-md border border-slate-200">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Total Balance</p>
                                    <p className="text-xs text-slate-500">$300</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Balance</p>
                                <p className="text-xl font-bold text-slate-900">$268.91</p>
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
