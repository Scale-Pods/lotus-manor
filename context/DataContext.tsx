"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { consolidateLeads, ConsolidatedLead } from "@/lib/leads-utils";
import { supabase } from "@/lib/supabase";

interface DataContextType {
    leads: ConsolidatedLead[];
    calls: any[];
    loadingLeads: boolean;
    loadingCalls: boolean;
    loadingBalances: boolean;
    voiceBalance: any;
    maqsamBalance: any;
    error: string | null;
    refreshLeads: () => Promise<void>;
    refreshCalls: () => Promise<void>;
    refreshBalances: () => Promise<void>;
    refreshAll: () => Promise<void>;
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
    const [error, setError] = useState<string | null>(null);

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

    const fetchCalls = useCallback(async () => {
        setLoadingCalls(true);
        try {
            const response = await fetch('/api/calls');
            if (!response.ok) throw new Error('Failed to fetch calls');
            const data = await response.json();
            setCalls(data);
        } catch (err: any) {
            console.error('DataProvider calls fetch error:', err);
        } finally {
            setLoadingCalls(false);
        }
    }, []);

    const fetchBalances = useCallback(async () => {
        setLoadingBalances(true);
        try {
            const [vapiRes, maqsamRes] = await Promise.all([
                fetch('/api/vapi/balance'),
                fetch('/api/maqsam/balance')
            ]);

            if (vapiRes.ok) {
                const vapiData = await vapiRes.json();
                setVoiceBalance(vapiData);
            }
            if (maqsamRes.ok) {
                const maqsamData = await maqsamRes.json();
                setMaqsamBalance(maqsamData);
            }
        } catch (err) {
            console.error('DataProvider balances fetch error:', err);
        } finally {
            setLoadingBalances(false);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([fetchLeads(), fetchCalls(), fetchBalances()]);
    }, [fetchLeads, fetchCalls, fetchBalances]);

    useEffect(() => {
        refreshAll();

        // Real-time polling for calls and balances (every 30 seconds)
        const pollInterval = setInterval(() => {
            // console.log('Polling for new calls and balance updates...');
            fetchCalls();
            fetchBalances();
        }, 30000);

        // 🚀 OPTION 3: Supabase Realtime Implementation
        // Subscribe to all 3 leads tables for instant updates
        const leadsChannel = supabase
            .channel('public:leads_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'nr_wf' },
                () => {
                    console.log('Realtime change detected in nr_wf -> Refreshing leads');
                    fetchLeads();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'followup' },
                () => {
                    console.log('Realtime change detected in followup -> Refreshing leads');
                    fetchLeads();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'nurture' },
                () => {
                    console.log('Realtime change detected in nurture -> Refreshing leads');
                    fetchLeads();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(leadsChannel);
            clearInterval(pollInterval);
        };
    }, [refreshAll, fetchLeads, fetchCalls, fetchBalances]);

    return (
        <DataContext.Provider value={{
            leads,
            calls,
            loadingLeads,
            loadingCalls,
            loadingBalances,
            voiceBalance,
            maqsamBalance,
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
