// src/components/HorizontalBarChart.tsx
"use client";

import * as d3 from "d3";
import React, { useMemo } from "react";

type LabelAccessor<T> = (d: T, i: number) => string;
type ValueAccessor<T> = (d: T, i: number) => number;
type KeyAccessor<T> = (d: T, i: number) => string;

export interface HorizontalBarChartProps<T> {
    data: T[];

    width?: number;
    height?: number;

    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    keyFn?: KeyAccessor<T>;
    label: LabelAccessor<T>;
    value: ValueAccessor<T>;

    /** If provided, used exactly (overrides tightXDomain). */
    xDomain?: [number, number];

    /** Zoom x-axis to [min..max] of shown bars (with padding). */
    tightXDomain?: boolean;

    /** Padding added when tightXDomain=true (in value units). */
    tightXPad?: number;

    sortDescending?: boolean;
    maxBars?: number;

    showAxes?: boolean;
    showGrid?: boolean;

    barFill?: string;
    barTitle?: (d: T, i: number) => string;

    title?: string;
    xLabel?: string;
    yLabel?: string;

    className?: string;

    /** Optional: linking hook (e.g., highlight year in other view) */
    onBarHover?: (d: T | null) => void;
}

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
    const [tooltip, setTooltip] = React.useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);

    function showTooltipAt(e: React.MouseEvent<SVGRectElement>, text: string) {
        setTooltip({ x: e.clientX + 12, y: e.clientY + 12, text });
    }
    function hideTooltip() {
        setTooltip(null);
    }

    const { bars, xScale, yScale, xTicks, domainMin } = useMemo(() => {
        const projected = data
            .map((d, i) => ({
                key: keyFn ? keyFn(d, i) : String(i),
                raw: d,
                label: label(d, i),
                value: value(d, i),
                i,
            }))
            .filter((d) => Number.isFinite(d.value));

        const sorted = sortDescending
            ? [...projected].sort((a, b) => b.value - a.value)
            : projected;

        const sliced = typeof maxBars === "number" ? sorted.slice(0, maxBars) : sorted;

        const vMin = d3.min(sliced, (d) => d.value) ?? 0;
        const vMax = d3.max(sliced, (d) => d.value) ?? 1;

        let dom: [number, number];

        if (xDomain) {
            dom = xDomain;
        } else if (tightXDomain) {
            const pad = Math.max(tightXPad, (vMax - vMin) * 0.15);
            dom = [vMin - pad, vMax + pad];
            // Ratings clamp (safe if you're using ratings; harmless otherwise)
            dom = [Math.max(0, dom[0]), Math.min(10, dom[1])];
        } else {
            dom = [0, vMax];
        }

        if (dom[0] === dom[1]) dom = [dom[0] - 1, dom[1] + 1];

        const xScale = d3.scaleLinear(dom, [marginLeft, width - marginRight]);

        const bandIds = sliced.map((d) => d.key);
        const yScale = d3
            .scaleBand<string>()
            .domain(bandIds)
            .range([marginTop, height - marginBottom])
            .padding(0.2);

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

    const x0 = xScale(domainMin);
    const tickFormat = (t: number) => (tightXDomain ? t.toFixed(2) : t.toFixed(1));

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

                {/* Grid */}
                {showGrid && (
                    <g opacity={0.2}>
                        {xTicks.map(({ t, x }) => (
                            <line
                                key={`gx-${t}`}
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
                        {/* baseline starts at x0 when zoomed */}
                        <line
                            x1={x0}
                            x2={width - marginRight}
                            y1={height - marginBottom}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {xTicks.map(({ t, x }) => (
                            <g key={`xt-${t}`} transform={`translate(${x},${height - marginBottom})`}>
                                <line y2={6} stroke="currentColor" />
                                <text y={16} textAnchor="middle">
                                    {tickFormat(t)}
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

                    const hoverable = Boolean(barTitle);
                    const text = barTitle ? barTitle(b.raw, b.i) : "";

                    return (
                        <g key={b.key}>
                            {/* Left labels */}
                            <text
                                x={marginLeft - 10}
                                y={y + yScale.bandwidth() / 2}
                                dy="0.32em"
                                textAnchor="end"
                                fontSize={10}
                            >
                                {b.label}
                            </text>

                            <rect
                                x={x0}
                                y={y}
                                width={Math.max(0, w)}
                                height={yScale.bandwidth()}
                                fill={barFill}
                                style={{ cursor: hoverable ? "help" : "default" }}
                                onMouseEnter={() => onBarHover?.(b.raw)}
                                onMouseMove={hoverable ? (e) => showTooltipAt(e, text) : undefined}
                                onMouseLeave={() => {
                                    if (hoverable) hideTooltip();
                                    onBarHover?.(null);
                                }}
                            />

                            {/* Value labels */}
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