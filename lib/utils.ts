import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function calculateDuration(call: any): number {
    let seconds = 0;
    if (typeof call.durationSeconds === 'number') seconds = call.durationSeconds;
    else if (typeof call.duration === 'number') seconds = call.duration;

    if (seconds === 0 && call.endedAt && call.startedAt) {
        const start = new Date(call.startedAt).getTime();
        const end = new Date(call.endedAt).getTime();
        seconds = (end - start) / 1000;
    }

    // If call is active (no endedAt)
    if (seconds === 0 && call.status === 'active' && call.startedAt) {
        const start = new Date(call.startedAt).getTime();
        const now = Date.now();
        seconds = (now - start) / 1000;
    }

    return Math.max(0, seconds);
}

export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
}
