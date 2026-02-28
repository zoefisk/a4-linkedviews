"use client";

import React from "react";

export type TooltipState = {
    x: number;
    y: number;
    text: string;
};

export default function CustomTooltip(props: { tooltip: TooltipState | null }) {
    const t = props.tooltip;
    if (!t) return null;

    return (
        <div
            style={{
                position: "fixed",
                left: t.x + 12,
                top: t.y + 12,
                background: "rgba(0,0,0,0.85)",
                color: "white",
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.2,
                whiteSpace: "pre-line",
                pointerEvents: "none",
                zIndex: 9999,
                maxWidth: 360,
            }}
        >
            {t.text}
        </div>
    );
}