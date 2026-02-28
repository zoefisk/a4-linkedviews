// src/components/HorizontalBarChart.tsx
"use client";

import * as d3 from "d3";
import React, { useMemo, useState } from "react";

/**
 * Accessor signatures for generic chart data.
 */
type LabelAccessor<T> = (d: T, i: number) => string;
type ValueAccessor<T> = (d: T, i: number) => number;
type KeyAccessor<T> = (d: T, i: number) => string;

/**
 * Props for a reusable horizontal bar chart.
 *
 * This component is designed to:
 * - Render a labeled horizontal bar chart using SVG.
 * - Optionally show axes and gridlines.
 * - Optionally "zoom" the x-domain to the visible data range so small differences look bigger.
 * - Support linked-view interactions via `onBarHover` (e.g., highlight a point in another chart).
 */
export interface HorizontalBarChartProps<T> {
    /** Data array to render. */
    data: T[];

    /** SVG width in pixels. */
    width?: number;

    /** SVG height in pixels. */
    height?: number;

    /** Chart margins (in pixels). */
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    /**
     * Unique key per datum for stable rendering.
     * If omitted, the array index is used (fine for static lists, less ideal for dynamic updates).
     */
    keyFn?: KeyAccessor<T>;

    /** Label shown on the left of each bar. */
    label: LabelAccessor<T>;

    /** Numeric value encoded by bar length. Must be finite for a bar to render. */
    value: ValueAccessor<T>;

    /**
     * If provided, used exactly (and overrides `tightXDomain`).
     * Example: `[0, 10]` for ratings.
     */
    xDomain?: [number, number];

    /**
     * When true (and `xDomain` is not provided), use a tight domain around the
     * min/max values in the *displayed* bars, with padding. This makes small
     * differences visually larger.
     */
    tightXDomain?: boolean;

    /**
     * Padding amount in x-value units used when `tightXDomain` is enabled.
     * Example: `0.03` for ratings.
     */
    tightXPad?: number;

    /** Sort bars by value descending (default true). */
    sortDescending?: boolean;

    /** Maximum number of bars to show (after sorting). */
    maxBars?: number;

    /** Toggle axes rendering. */
    showAxes?: boolean;

    /** Toggle vertical grid lines aligned with x ticks. */
    showGrid?: boolean;

    /** Fill color for bars. */
    barFill?: string;

    /**
     * Tooltip string generator.
     * If provided, hovering a bar shows a tooltip and the cursor becomes "help".
     */
    barTitle?: (d: T, i: number) => string;

    /** Optional chart title rendered at top of SVG. */
    title?: string;

    /** Optional x-axis label rendered at bottom. */
    xLabel?: string;

    /** Optional y-axis label rendered rotated on the left. */
    yLabel?: string;

    /** Optional className attached to the SVG element. */
    className?: string;

    /**
     * Optional linked-view hook:
     * Called with the hovered datum on enter, and `null` on leave.
     * Use this to highlight a related element in another chart.
     */
    onBarHover?: (d: T | null) => void;
}

/**
 * Horizontal bar chart (generic).
 */
export default function HorizontalBarChart<T>({
                                                  data,
                                                  width = 700,
                                                  height = 400,
                                                  marginTop = 20,
                                                  marginRight = 20,
                                                  marginBottom = 44,
                                                  marginLeft = 220,

                                                  keyFn,
                                                  label,
                                                  value,

                                                  xDomain,
                                                  tightXDomain = false,
                                                  tightXPad = 0.05,

                                                  sortDescending = true,
                                                  maxBars,

                                                  showAxes = true,
                                                  showGrid = false,

                                                  barFill = "currentColor",
                                                  barTitle,
                                                  title,
                                                  xLabel,
                                                  yLabel,
                                                  className,

                                                  onBarHover,
                                              }: HorizontalBarChartProps<T>) {
    /**
     * Tooltip state.
     * (Kept internal to this component, since it’s purely presentational.)
     */
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

    function showTooltipAt(e: React.MouseEvent<SVGRectElement>, text: string) {
        setTooltip({ x: e.clientX + 12, y: e.clientY + 12, text });
    }

    function hideTooltip() {
        setTooltip(null);
    }

    /**
     * Compute:
     * - normalized bar records (stable keys, labels, numeric values)
     * - scales and ticks
     * - baseline (domainMin) for drawing bars (important for tight domains)
     */
    const { bars, xScale, yScale, xTicks, domainMin } = useMemo(() => {
        // Normalize incoming data into a stable internal shape.
        const projected = data
            .map((d, i) => ({
                key: keyFn ? keyFn(d, i) : String(i),
                raw: d,
                label: label(d, i),
                value: value(d, i),
                i,
            }))
            .filter((d) => Number.isFinite(d.value));

        // Sort (optionally) and slice.
        const sorted = sortDescending ? [...projected].sort((a, b) => b.value - a.value) : projected;
        const sliced = typeof maxBars === "number" ? sorted.slice(0, maxBars) : sorted;

        // Protect against empty slices to avoid extent issues.
        const vMin = d3.min(sliced, (d) => d.value) ?? 0;
        const vMax = d3.max(sliced, (d) => d.value) ?? 1;

        // Determine domain.
        let dom: [number, number];
        if (xDomain) {
            // Use explicit domain exactly if provided.
            dom = xDomain;
        } else if (tightXDomain) {
            // Zoom in to visible range (+ padding) to exaggerate small differences.
            const pad = Math.max(tightXPad, (vMax - vMin) * 0.15);
            dom = [vMin - pad, vMax + pad];

            dom = [Math.max(0, dom[0]), Math.min(10, dom[1])];
        } else {
            // Default: start at 0 and go to max value.
            dom = [0, vMax];
        }

        // If domain collapses (all values equal), expand slightly to prevent NaNs.
        if (dom[0] === dom[1]) dom = [dom[0] - 1, dom[1] + 1];

        // X scale maps values to pixel positions.
        const xScale = d3.scaleLinear(dom, [marginLeft, width - marginRight]);

        // Y scale maps bar IDs to vertical bands.
        const bandIds = sliced.map((d) => d.key);
        const yScale = d3
            .scaleBand<string>()
            .domain(bandIds)
            .range([marginTop, height - marginBottom])
            .padding(0.2);

        // Generate ticks; use more ticks when zoomed.
        const tickCount = tightXDomain ? 6 : 5;
        const xTicks = xScale.ticks(tickCount).map((t) => ({ t, x: xScale(t) }));

        return { bars: sliced, xScale, yScale, xTicks, domainMin: dom[0] };
    }, [
        data,
        keyFn,
        label,
        value,
        sortDescending,
        maxBars,
        xDomain,
        tightXDomain,
        tightXPad,
        width,
        height,
        marginLeft,
        marginRight,
        marginTop,
        marginBottom,
    ]);

    /**
     * Baseline for bars:
     * - In non-zoom mode, baseline is usually xScale(0).
     * - In tight domain mode, baseline is xScale(domainMin) so bars grow from the left edge of the zoom.
     */
    const x0 = xScale(domainMin);

    /**
     * Tick label formatting: show more precision when zoomed.
     */
    const formatTick = (t: number) => (tightXDomain ? t.toFixed(2) : t.toFixed(1));

    return (
        <>
            <svg width={width} height={height} className={className}>
                {/* Title */}
                {title && (
                    <text
                        x={(marginLeft + (width - marginRight)) / 2}
                        y={Math.max(14, marginTop - 6)}
                        textAnchor="middle"
                        fontSize={14}
                        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                    >
                        {title}
                    </text>
                )}

                {/* Grid lines (vertical) */}
                {showGrid && (
                    <g opacity={0.2}>
                        {xTicks.map(({ t, x }) => (
                            <line
                                key={`grid-x-${t}`}
                                x1={x}
                                x2={x}
                                y1={marginTop}
                                y2={height - marginBottom}
                                stroke="currentColor"
                            />
                        ))}
                    </g>
                )}

                {/* Axes */}
                {showAxes && (
                    <g fontSize={10} fill="currentColor">
                        {/* X axis baseline: start at x0 so it matches the rendered baseline when zoomed */}
                        <line
                            x1={x0}
                            x2={width - marginRight}
                            y1={height - marginBottom}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {xTicks.map(({ t, x }) => (
                            <g key={`tick-x-${t}`} transform={`translate(${x},${height - marginBottom})`}>
                                <line y2={6} stroke="currentColor" />
                                <text y={16} textAnchor="middle">
                                    {formatTick(t)}
                                </text>
                            </g>
                        ))}
                    </g>
                )}

                {/* Axis labels */}
                {xLabel && (
                    <text
                        x={(marginLeft + (width - marginRight)) / 2}
                        y={height - 6}
                        textAnchor="middle"
                        fontSize={12}
                        opacity={0.8}
                        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                    >
                        {xLabel}
                    </text>
                )}

                {yLabel && (
                    <text
                        transform={`translate(14, ${(marginTop + (height - marginBottom)) / 2}) rotate(-90)`}
                        textAnchor="middle"
                        fontSize={12}
                        opacity={0.8}
                        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                    >
                        {yLabel}
                    </text>
                )}

                {/* Bars */}
                {bars.map((b) => {
                    const y = yScale(b.key);
                    if (y == null) return null;

                    const w = xScale(b.value) - x0;

                    const hasTooltip = Boolean(barTitle);
                    const tooltipText = barTitle ? barTitle(b.raw, b.i) : "";

                    return (
                        <g key={b.key}>
                            {/* Left-side label */}
                            <text
                                x={marginLeft - 10}
                                y={y + yScale.bandwidth() / 2}
                                dy="0.32em"
                                textAnchor="end"
                                fontSize={10}
                            >
                                {b.label}
                            </text>

                            {/* Bar rectangle */}
                            <rect
                                x={x0}
                                y={y}
                                width={Math.max(0, w)}
                                height={yScale.bandwidth()}
                                fill={barFill}
                                style={{ cursor: hasTooltip ? "help" : "default" }}
                                onMouseEnter={() => onBarHover?.(b.raw)}
                                onMouseMove={hasTooltip ? (e) => showTooltipAt(e, tooltipText) : undefined}
                                onMouseLeave={() => {
                                    if (hasTooltip) hideTooltip();
                                    onBarHover?.(null);
                                }}
                            />

                            {/* Value label at the end of the bar */}
                            <text
                                x={xScale(b.value) + 6}
                                y={y + yScale.bandwidth() / 2}
                                dy="0.32em"
                                fontSize={10}
                            >
                                {b.value.toFixed(2)}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip overlay (HTML) */}
            {tooltip && (
                <div
                    style={{
                        position: "fixed",
                        left: tooltip.x,
                        top: tooltip.y,
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
                    {tooltip.text}
                </div>
            )}
        </>
    );
}