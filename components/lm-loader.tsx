"use client";

import React from "react";

export const LMLoader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-500">
            <div className="relative flex flex-col items-center justify-center">

                {/* Animated Background Glow */}
                <div className="absolute w-64 h-64 bg-yellow-500/20 rounded-full blur-[80px] animate-pulse"></div>

                {/* Circular Container - Similar to the image */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Outer Spinning Yellow Border */}
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-500 border-r-yellow-500/30 animate-[spin_2s_linear_infinite]"></div>

                    {/* Inner Black Circle */}
                    <div className="w-32 h-32 bg-black rounded-full border-2 border-yellow-500 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden group">

                        {/* Mirror Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>

                        {/* The LM House Logo - Custom Path to match user image */}
                        <svg
                            viewBox="0 0 100 100"
                            className="w-20 h-20 relative z-10"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Yellow L part - Left vertical and bottom horizontal */}
                            <path
                                d="M28 45V72H58"
                                stroke="#EAB308"
                                strokeWidth="10"
                                strokeLinecap="butt"
                                strokeLinejoin="miter"
                                className="animate-pulse"
                            />

                            {/* White M part - Framing the house and roof */}
                            <path
                                d="M38 72V42L50 30L62 42V72M50 30V55"
                                stroke="white"
                                strokeWidth="10"
                                strokeLinecap="butt"
                                strokeLinejoin="miter"
                                className="animate-pulse"
                                style={{ animationDelay: "0.2s" }}
                            />
                        </svg>
                    </div>
                </div>

                {/* Advanced Text Section */}
                <div className="mt-10 text-center space-y-3">
                    <div className="flex flex-col items-center">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                            <span className="text-yellow-500">LOTUS</span>
                            <span className="text-white ml-2">MANOR</span>
                        </h2>
                        <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mt-1"></div>
                    </div>

                    <p className="text-[10px] font-bold tracking-[0.4em] text-yellow-500/60 uppercase">
                        Real Estate Excellence
                    </p>

                    {/* Loading Indicator */}
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LMLoader;
