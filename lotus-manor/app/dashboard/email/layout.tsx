"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Send,
    Inbox,
    AlertCircle,
    Key,
    ArrowLeft,
    BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";

const emailSidebarItems = [
    {
        title: "Dashboard",
        href: "/dashboard/email",
        icon: LayoutDashboard,
    },
    
    {
        title: "Sent",
        href: "/dashboard/email/sent",
        icon: Send,
    },
    {
        title: "Received",
        href: "/dashboard/email/received",
        icon: Inbox,
    },
    {
        title: "Bounces",
        href: "/dashboard/email/bounces",
        icon: AlertCircle,
    },
    {
        title: "Analytics",
        href: "/dashboard/email/analytics",
        icon: BarChart3,
    },
    {
        title: "Credentials",
        href: "/dashboard/email/credentials",
        icon: Key,
    },
];

export default function EmailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 text-slate-900">
            <aside className="w-64 flex-col bg-white border-r border-zinc-200 hidden md:flex font-sans">
                <div className="p-6 pb-4 flex justify-center">
                    <div className="relative w-48 h-16">
                        <Image
                            src="https://lotusmanor.ae/logoheader.webp"
                            alt="Lotus Manor Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <div className="px-4 py-2">
                    <div className="h-[1px] w-full bg-zinc-100"></div>
                </div>

                <nav className="flex-1 overflow-auto px-4 space-y-2">
                    {emailSidebarItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-zinc-100"
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 transition-colors"}`} />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto p-4 mb-4">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-slate-500 hover:text-slate-900 hover:bg-zinc-100" asChild>
                        <Link href="/dashboard">
                            <ArrowLeft className="h-4 w-4" />
                            Master Dashboard
                        </Link>
                    </Button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-zinc-50 p-6">
                {children}
            </main>
        </div>
    );
}
