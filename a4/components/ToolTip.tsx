"use client";

import React from "react";

/**
 * Runtime state for the tooltip overlay.
 * Screen coordinates are used so the tooltip can float
 * above SVGs and other positioned elements.
 */
export type TooltipState = {
    /** X position in viewport (pixels) */
    x: number;

    /** Y position in viewport (pixels) */
    y: number;

    /** Text content displayed inside the tooltip */
    text: string;
};

/**
 * CustomTooltip
 * --------------------------------------------------
 * Lightweight, reusable tooltip component designed
 * for D3 + SVG visualizations in React.
 *
 * - Uses `position: fixed` so it is NOT clipped by SVG bounds
 * - Accepts preformatted multiline text
 * - Pointer events disabled so it never interferes with hover
 *
 * This component is intentionally presentation-only:
 * it does not manage timing, positioning logic, or events.
 * Those responsibilities stay with the visualization.
 */
export default function CustomTooltip(props: {
    /** Tooltip state or null when hidden */
    tooltip: TooltipState | null;
}) {
    const t = props.tooltip;

    // Do not render anything if tooltip is inactive
    if (!t) return null;

    return (
        <div
            style={{
                position: "fixed",

                // Offset slightly so it doesn't sit directly under the cursor
                left: t.x + 12,
                top: t.y + 12,

                background: "rgba(0,0,0,0.85)",
                color: "white",
                padding: "8px 10px",
                borderRadius: 8,

                fontSize: 12,
                lineHeight: 1.2,
                whiteSpace: "pre-line",

                // Prevent tooltip from blocking mouse events
                pointerEvents: "none",

                // Ensure it stays above SVGs and charts
                zIndex: 9999,

                maxWidth: 360,
            }}
        >
            {t.text}
        </div>
    );
}