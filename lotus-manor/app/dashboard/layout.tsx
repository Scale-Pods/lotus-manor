"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, MessageCircle, Mic, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    if (pathname.startsWith("/dashboard/email") || pathname.startsWith("/dashboard/whatsapp") || pathname.startsWith("/dashboard/voice")) {
        return <>{children}</>;
    }

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

                <div className="px-4 py-2">
                    <div className="h-[1px] w-full bg-zinc-100"></div>
                </div>

                <nav className="flex-1 overflow-auto px-4 space-y-2">
                    {sidebarItems.map((item, index) => {
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
                <div className="mt-auto p-4 mb-4">
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
                        {sidebarItems.find((item) => item.href === pathname)?.title || "Dashboard"}
                    </h1>
                    <div className="ml-auto flex items-center gap-4">
                        {/* Add user menu or notifications here */}
                        <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200"></div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-zinc-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
