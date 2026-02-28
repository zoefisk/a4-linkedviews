"use client";

import React from "react";

export type TooltipState = {
    x: number; // viewport x (clientX)
    y: number; // viewport y (clientY)
    text: string;
};

export default function CustomTooltip(props: {
    tooltip: TooltipState | null;
    offsetX?: number;
    offsetY?: number;
    maxWidth?: number;
}) {
    const { tooltip, offsetX = 12, offsetY = 12, maxWidth = 420 } = props;

    if (!tooltip) return null;

    return (
        <div
            style={{
                position: "fixed",
                left: tooltip.x + offsetX,
                top: tooltip.y + offsetY,
                background: "rgba(0,0,0,0.88)",
                color: "white",
                padding: "8px 10px",
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.25,
                whiteSpace: "pre-line",
                pointerEvents: "none", // IMPORTANT: never block brushing/mouse
                zIndex: 9999,
                maxWidth,
                boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
        >
            {tooltip.text}
        </div>
    );
}