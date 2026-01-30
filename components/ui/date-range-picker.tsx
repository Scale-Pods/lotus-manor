"use client"

import * as React from "react"
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DateRangePicker({
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    })
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return <div className={cn("grid gap-2 h-10 w-[260px] bg-slate-100 rounded-xl animate-pulse", className)}></div>
    }

    const presets = [
        {
            label: "Today",
            getValue: () => {
                const today = new Date();
                return { from: today, to: today };
            }
        },
        {
            label: "Last 7 days",
            getValue: () => {
                const today = new Date();
                return { from: subDays(today, 7), to: today };
            }
        },
        {
            label: "Last 30 days",
            getValue: () => {
                const today = new Date();
                return { from: subDays(today, 30), to: today };
            }
        },
        {
            label: "This Month",
            getValue: () => {
                const today = new Date();
                return { from: startOfMonth(today), to: endOfMonth(today) };
            }
        },
        {
            label: "Last 3 Months",
            getValue: () => {
                const today = new Date();
                return { from: subMonths(today, 3), to: today };
            }
        },
        {
            label: "Last 6 Months",
            getValue: () => {
                const today = new Date();
                return { from: subMonths(today, 6), to: today };
            }
        },
        {
            label: "Last 1 year",
            getValue: () => {
                const today = new Date();
                return { from: subYears(today, 1), to: today };
            }
        },
    ];

    const handlePresetChange = (value: string) => {
        const preset = presets.find(p => p.label === value);
        if (preset) {
            setDate(preset.getValue());
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal bg-white border-zinc-200 text-slate-900 hover:bg-zinc-50 rounded-xl h-10 shadow-sm",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex">
                        <div className="p-2 border-r border-slate-100 w-[160px]">
                            <div className="space-y-1">
                                {presets.map((preset) => (
                                    <Button
                                        key={preset.label}
                                        variant="ghost"
                                        className="w-full justify-start font-normal text-sm h-8"
                                        onClick={() => handlePresetChange(preset.label)}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                                <div className="pt-2 mt-2 border-t border-slate-100">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start font-normal text-sm h-8 text-slate-500 hover:text-slate-900"
                                    >
                                        Custom Range
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-0">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
