"use client";

import { use } from "react";
import { WhatsAppChatDetail } from "@/components/dashboard/whatsapp-chat-detail";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
    const { customerId } = use(params);

    return (
        <div className="space-y-6 pb-10 h-[calc(100vh-140px)] flex flex-col">
            <div className="shrink-0">
                <Link href="/dashboard/whatsapp/chat">
                    <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" /> Back to Chats
                    </Button>
                </Link>
            </div>

            <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <WhatsAppChatDetail customerId={customerId} />
            </div>
        </div>
    );
}
