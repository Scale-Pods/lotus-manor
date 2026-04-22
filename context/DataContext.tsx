"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { consolidateLeads, ConsolidatedLead } from "@/lib/leads-utils";
import { subDays } from "date-fns";

interface DataContextType {
    leads: ConsolidatedLead[];
    calls: any[];
    loadingLeads: boolean;
    loadingCalls: boolean;
    loadingBalances: boolean;
    voiceBalance: any;
    maqsamBalance: any;
    twilioBalance: any;
    error: string | null;
    refreshLeads: () => Promise<void>;
    refreshCalls: (params?: { from?: Date; to?: Date; includeElevenLabs?: boolean }) => Promise<void>;
    refreshBalances: () => Promise<void>;
    refreshAll: (params?: { from?: Date; to?: Date; includeElevenLabs?: boolean }) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [leads, setLeads] = useState<ConsolidatedLead[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingCalls, setLoadingCalls] = useState(true);
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [voiceBalance, setVoiceBalance] = useState<any>(null);
    const [maqsamBalance, setMaqsamBalance] = useState<any>(null);
    const [twilioBalance, setTwilioBalance] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Gatekeeper to prevent redundant identical calls
    const lastCallParams = useRef<string | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoadingLeads(true);
        try {
            const response = await fetch('/api/leads');
            if (!response.ok) throw new Error('Failed to fetch leads');
            const data = await response.json();
            const consolidated = consolidateLeads(data);
            setLeads(consolidated);
        } catch (err: any) {
            console.error('DataProvider leads fetch error:', err);
            setError(err.message);
        } finally {
            setLoadingLeads(false);
        }
    }, []);

    const fetchCalls = useCallback(async (params?: { from?: Date; to?: Date; includeElevenLabs?: boolean }) => {
        try {
            const rawFrom = params?.from || new Date("2016-01-01"); // Static date for "All Time" to help gatekeeper
            const rawTo = params?.to || new Date();
            const includeElevenLabs = params?.includeElevenLabs || false;

            const fromDate = new Date(rawFrom);
            const toDate = new Date(rawTo);
            toDate.setHours(23, 59, 59, 999);

            const query = new URLSearchParams({
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                includeElevenLabs: String(includeElevenLabs)
            });

            const currentQuery = query.toString();

            // Skip if requested params are identical to the last SUCCESSFUL or ONGOING load
            if (lastCallParams.current === currentQuery) {
                // If it's still loading the same thing, just wait
                return;
            }

            setLoadingCalls(true);
            lastCallParams.current = currentQuery;

            const response = await fetch(`/api/calls?${currentQuery}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) setCalls(data);
            } else {
                // If failed, clear last params to allow retry
                lastCallParams.current = null;
            }
        } catch (err: any) {
            console.error('DataProvider calls fetch error:', err);
            lastCallParams.current = null;
        } finally {
            setLoadingCalls(false);
        }
    }, []);

    const fetchBalances = useCallback(async () => {
        try {
            const [vapiRes, maqsamRes, twilioRes] = await Promise.all([
                fetch('/api/vapi/balance'),
                fetch('/api/maqsam/balance'),
                fetch('/api/twilio/balance')
            ]);
            if (vapiRes.ok) setVoiceBalance(await vapiRes.json());
            if (maqsamRes.ok) setMaqsamBalance(await maqsamRes.json());
            if (twilioRes.ok) setTwilioBalance(await twilioRes.json());
        } catch (err) { }
        finally { setLoadingBalances(false); }
    }, []);

    const refreshAll = useCallback(async (params?: { from?: Date; to?: Date; includeElevenLabs?: boolean }) => {
        await Promise.all([fetchLeads(), fetchCalls(params), fetchBalances()]);
    }, [fetchLeads, fetchCalls, fetchBalances]);

    useEffect(() => {
        // Master Dashboard strategy: Fetch everything on mount
        refreshAll({ includeElevenLabs: false });
    }, []);

    return (
        <DataContext.Provider value={{
            leads,
            calls,
            loadingLeads,
            loadingCalls,
            loadingBalances,
            voiceBalance,
            maqsamBalance,
            twilioBalance,
            error,
            refreshLeads: fetchLeads,
            refreshCalls: fetchCalls,
            refreshBalances: fetchBalances,
            refreshAll
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
