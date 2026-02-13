"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Mail, MessageCircle, Mic, Settings, LogOut, ChevronDown, Wallet, BarChart2, Users, Send, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

    // Vapi Balance State
    const [vapiBalance, setVapiBalance] = useState<number | null>(null);
    const [loadingVapi, setLoadingVapi] = useState(true);

    useEffect(() => {
        const fetchVapiBalance = async () => {
            try {
                const res = await fetch('/api/vapi/balance');
                if (res.ok) {
                    const data = await res.json();
                    // Assuming data.amount or similar structure. 
                    // API typically returns { amount: 12.50, currency: 'USD' } or similar.
                    // Let's assume data.amount for now, based on typical billing APIs.
                    // If simply { amount: 10 }, use that.
                    if (data.amount !== undefined) {
                        setVapiBalance(Number(data.amount));
                    } else {
                        // Fallback if structure is different
                        console.log("Vapi balance data:", data);
                    }
                }
            } catch (error) {
                console.error("Vapi balance fetch failed", error);
            } finally {
                setLoadingVapi(false);
            }
        };

        fetchVapiBalance();
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
                    {/* Vapi Credits */}
                    <div className="bg-white border border-yellow-200 rounded-xl p-3 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Vapi Credits</span>
                            <div className="p-1 bg-yellow-50 rounded-md">
                                <Wallet className="h-3 w-3 text-yellow-600" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1 relative z-10">
                            <span className="text-xl font-bold tracking-tight text-slate-900">
                                {loadingVapi ? "..." : (vapiBalance !== null ? `$${vapiBalance.toFixed(2)}` : "N/A")}
                            </span>
                            <span className="text-[10px] text-slate-500">USD</span>
                        </div>
                    </div>

                    {/* Maqsam Credits */}
                    <div className="bg-white border border-cyan-200 rounded-xl p-3 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Maqsam Credits</span>
                            <div className="p-1 bg-cyan-50 rounded-md">
                                <Wallet className="h-3 w-3 text-cyan-600" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1 relative z-10">
                            <span className="text-xl font-bold tracking-tight text-slate-900">$50.00</span>
                            <span className="text-[10px] text-slate-500">USD</span>
                        </div>
                    </div>

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
                    <h1 className="text-lg font-semibold text-slate-900">
                        {pathname === "/dashboard" ? "Master Overview" : activeConfig.items.find((item: any) => item.href === pathname)?.title || activeConfig.label}
                    </h1>

                </header>
                <main className="flex-1 overflow-auto bg-zinc-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
