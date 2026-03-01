"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Mail, MessageCircle, Mic, Settings, LogOut, ChevronDown, Wallet, BarChart2, Users, Send, Key, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Email Marketing",
        href: "/dashboard/email",
        icon: Mail,
    },
    {
        title: "WhatsApp",
        href: "/dashboard/whatsapp",
        icon: MessageCircle,
    },
    {
        title: "Voice Agent",
        href: "/dashboard/voice",
        icon: Mic,
    },
];

function WalletModal({ isOpen, onClose, type, details }: { isOpen: boolean, onClose: () => void, type: 'vapi' | 'maqsam', details?: any }) {
    const isVapi = type === 'vapi';
    const title = isVapi ? 'ElevenLabs' : 'Maqsam';

    // Parse the data
    const used = details ? (isVapi ? details.character_count : details.used) : null;
    const limit = details ? (isVapi ? details.character_limit : details.limit) : null;
    const left = (typeof limit === 'number' && typeof used === 'number') ? limit - used : null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className={`h-5 w-5 ${isVapi ? 'text-yellow-600' : 'text-cyan-600'}`} />
                        <span>{title} Balance</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-6">
                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-100 flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col text-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Left Credits </span>
                                <span className={limit ? "text-xl font-bold text-emerald-600" : "text-xl font-bold text-slate-400"}>
                                    {typeof left === 'number' ? left.toLocaleString() : "---"}
                                </span>
                            </div>
                            <div className="flex flex-col text-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Used Credits</span>
                                <span className={limit ? "text-xl font-bold text-rose-600" : "text-xl font-bold text-slate-400"}>
                                    {typeof used === 'number' ? used.toLocaleString() : "---"}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col text-center bg-white p-4 rounded-lg border border-slate-100 shadow-sm content-center items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Max Credits</span>
                            <span className={limit ? "text-3xl font-bold text-slate-800" : "text-2xl font-bold text-slate-400"}>
                                {typeof limit === 'number' ? limit.toLocaleString() : "Api Key Undetected"}
                            </span>
                        </div>
                    </div>

                    <Button
                        className={`w-full text-white h-12 font-bold shadow-lg gap-2 ${isVapi ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-500/20' : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20'}`}
                        onClick={() => {
                            if (isVapi) window.open('https://elevenlabs.io/app/subscription', '_blank');
                            else window.open('https://maqsam.com/billing', '_blank');
                            onClose();
                        }}
                    >
                        <ExternalLink className="h-4 w-4" />
                        Manage Subscription
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    if (pathname.startsWith("/dashboard/email") || pathname.startsWith("/dashboard/whatsapp") || pathname.startsWith("/dashboard/voice")) {
        return <>{children}</>;
    }

    // Configuration for Context-Aware Sidebar
    const dashboardConfig = {
        master: {
            label: "Master Overview",
            icon: LayoutDashboard,
            items: [
                { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                { title: "Email Marketing", href: "/dashboard/email", icon: Mail },
                { title: "WhatsApp CRM", href: "/dashboard/whatsapp", icon: MessageCircle },
                { title: "Voice Agent", href: "/dashboard/voice", icon: Mic },
                { title: "Leads", href: "/dashboard/leads", icon: Users },
                { title: "Credentials", href: "/dashboard/credentials", icon: Key },
            ]
        },
        email: {
            label: "Email Marketing",
            icon: Mail,
            items: [
                { title: "Overview", href: "/dashboard/email", icon: LayoutDashboard },
                { title: "Analytics", href: "/dashboard/email/analytics", icon: BarChart2 },
            ]
        },
        whatsapp: {
            label: "WhatsApp CRM",
            icon: MessageCircle,
            items: [
                { title: "Overview", href: "/dashboard/whatsapp", icon: LayoutDashboard },
                { title: "Leads", href: "/dashboard/whatsapp/leads", icon: Users },
                { title: "Sent Messages", href: "/dashboard/whatsapp/sent", icon: Send },
            ]
        },
        voice: {
            label: "Voice Agent",
            icon: Mic,
            items: [
                { title: "Overview", href: "/dashboard/voice", icon: LayoutDashboard },
                { title: "Call Logs", href: "/dashboard/voice/logs", icon: Mic },
            ]
        }
    };

    // Determine current context
    let currentContext = "master";
    if (pathname.startsWith("/dashboard/email")) currentContext = "email";
    else if (pathname.startsWith("/dashboard/whatsapp")) currentContext = "whatsapp";
    else if (pathname.startsWith("/dashboard/voice")) currentContext = "voice";

    const activeConfig = (dashboardConfig as any)[currentContext];

    // ElevenLabs Balance State
    const [voiceBalance, setVoiceBalance] = useState<any>(null);
    const [maqsamBalance, setMaqsamBalance] = useState<any>(null);
    const [loadingVoice, setLoadingVoice] = useState(false);
    const [loadingMaqsam, setLoadingMaqsam] = useState(false);
    const [walletModal, setWalletModal] = useState<{ isOpen: boolean, type: 'vapi' | 'maqsam' }>({ isOpen: false, type: 'vapi' });

    useEffect(() => {
        const fetchBalance = async () => {
            setLoadingVoice(true);
            setLoadingMaqsam(true);
            try {
                // Fetch ElevenLabs
                fetch('/api/vapi/balance').then(res => res.json()).then(data => setVoiceBalance(data)).catch(() => { });

                // Fetch Maqsam
                fetch('/api/maqsam/balance').then(res => res.json()).then(data => setMaqsamBalance(data)).catch(() => { });
            } catch (err) {
                console.error("Error fetching balance:", err);
            } finally {
                setLoadingVoice(false);
                setLoadingMaqsam(false);
            }
        };
        fetchBalance();
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 text-slate-900">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col bg-white border-r border-zinc-200 md:flex font-sans">
                {/* Logo Section */}
                <div className="p-6 pb-4 flex justify-center">
                    <Link href="/" className="relative w-48 h-16 block">
                        <Image
                            src="https://lotusmanor.ae/logoheader.webp"
                            alt="Lotus Manor Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </Link>
                </div>

                <div className="px-4 pb-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                suppressHydrationWarning
                                variant="outline"
                                className="w-full justify-between bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-10 shadow-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <activeConfig.icon className="h-4 w-4 text-blue-600" />
                                    <span className="truncate">{activeConfig.label}</span>
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[220px]">
                            <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                                <LayoutDashboard className="mr-2 h-4 w-4" /> Master Overview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/dashboard/email")}>
                                <Mail className="mr-2 h-4 w-4" /> Email Marketing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/dashboard/whatsapp")}>
                                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp CRM
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/dashboard/voice")}>
                                <Mic className="mr-2 h-4 w-4" /> Voice Agent
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="px-4 py-2">
                    <div className="h-[1px] w-full bg-zinc-100"></div>
                </div>

                <nav className="flex-1 overflow-auto px-4 space-y-2">
                    {activeConfig.items.map((item: any, index: number) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
                                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-zinc-100"
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 transition-colors"}`} />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
                <div className="mt-auto p-4 mb-4 space-y-3">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-slate-500 hover:text-slate-900 hover:bg-zinc-100" asChild>
                        <Link href="/">
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Link>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-14 items-center gap-4 border-b border-zinc-200 bg-white px-6 lg:h-[60px]">
                    <div className="flex flex-1 items-center justify-between">
                        <h1 className="text-lg font-semibold text-slate-900">
                            {pathname === "/dashboard" ? "Master Overview" : activeConfig.items.find((item: any) => item.href === pathname)?.title || activeConfig.label}
                        </h1>

                        {currentContext === "master" && (
                            <div className="flex items-center gap-3">
                                {/* Vapi Wallet Button */}
                                <Button
                                    variant="outline"
                                    className="h-10 px-4 border-yellow-200 bg-yellow-50/30 hover:bg-yellow-50 text-yellow-700 gap-3 flex items-center shadow-sm transition-all"
                                    onClick={() => setWalletModal({ isOpen: true, type: 'vapi' })}
                                >
                                    <div className="p-1.5 bg-yellow-100 rounded-md">
                                        <Mic className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-start leading-[1.1]">
                                        <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">11Labs Credits</span>
                                        <span className="text-sm font-bold">
                                            {loadingVoice ? "..." : (voiceBalance !== null ? (voiceBalance.character_limit - voiceBalance.character_count).toLocaleString() : "N/A")}
                                        </span>
                                    </div>
                                </Button>


                                {/* Maqsam Wallet Button */}
                                <Button
                                    variant="outline"
                                    className="h-10 px-4 border-cyan-200 bg-cyan-50/30 hover:bg-cyan-50 text-cyan-700 gap-3 flex items-center shadow-sm transition-all"
                                    onClick={() => setWalletModal({ isOpen: true, type: 'maqsam' })}
                                >
                                    <div className="p-1.5 bg-cyan-100 rounded-md">
                                        <Wallet className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-start leading-[1.1]">
                                        <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">Maqsam Bal</span>
                                        <span className="text-sm font-bold">
                                            {loadingMaqsam ? "..." : (maqsamBalance && typeof maqsamBalance.limit === 'number' && typeof maqsamBalance.used === 'number' ? (maqsamBalance.limit - maqsamBalance.used).toLocaleString() : "N/A")}
                                        </span>
                                    </div>
                                </Button>
                            </div>
                        )}
                    </div>
                </header>

                <WalletModal
                    isOpen={walletModal.isOpen}
                    type={walletModal.type}
                    details={walletModal.type === 'vapi' ? voiceBalance : (walletModal.type === 'maqsam' ? maqsamBalance : null)}
                    onClose={() => setWalletModal({ ...walletModal, isOpen: false })}
                />

                <main className="flex-1 overflow-auto bg-zinc-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
