// src/components/HorizontalBarChart.tsx
"use client";

import * as d3 from "d3";
import React, { useMemo } from "react";

/**
 * Accessor returning a string label.
 */
type LabelAccessor<T> = (d: T, i: number) => string;

/**
 * Accessor returning a numeric value.
 */
type ValueAccessor<T> = (d: T, i: number) => number;

/**
 * Accessor returning a stable unique key.
 * NOTE: Use this when labels/titles can repeat (very common in movie datasets).
 */
type KeyAccessor<T> = (d: T, i: number) => string;

/**
 * Props for a reusable horizontal bar chart.
 *
 * This chart is intended for ranked / categorical comparisons
 * (e.g. top movies, top values within a brushed range).
 */
export interface HorizontalBarChartProps<T> {
    /** Data items */
    data: T[];

    /** SVG width (px) */
    width?: number;
    /** SVG height (px) */
    height?: number;

    /** Margins */
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    /** Stable key generator (recommended) */
    keyFn?: KeyAccessor<T>;

    /** Category label accessor */
    label: LabelAccessor<T>;

    /** Numeric value accessor */
    value: ValueAccessor<T>;

    /** Optional fixed x-domain */
    xDomain?: [number, number];

    /** Sort bars by value descending */
    sortDescending?: boolean;

    /** Maximum number of bars to display */
    maxBars?: number;

    /** Toggle axes */
    showAxes?: boolean;

    /** Toggle grid lines */
    showGrid?: boolean;

    /** Bar fill color */
    barFill?: string;

    /** Tooltip text on hover (if omitted, no tooltip) */
    barTitle?: (d: T, i: number) => string;

    className?: string;
}

/**
 * Generic horizontal bar chart.
 *
 * Designed to pair naturally with brushing selections
 * from other views (e.g., a line chart).
 */
export default function HorizontalBarChart<T>({
                                                  data,
                                                  width = 700,
                                                  height = 400,
                                                  marginTop = 20,
                                                  marginRight = 20,
                                                  marginBottom = 30,
                                                  marginLeft = 220,

                                                  keyFn,
                                                  label,
                                                  value,

                                                  xDomain,
                                                  sortDescending = true,
                                                  maxBars,

                                                  showAxes = true,
                                                  showGrid = false,

                                                  barFill = "currentColor",
                                                  barTitle,
                                                  className,
                                              }: HorizontalBarChartProps<T>) {
    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    /**
     * Tooltip state (fixed-position div tooltip like LinePlot).
     * Using viewport coords keeps the math simple and reliable inside SVG.
     */
    const [tooltip, setTooltip] = React.useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);

    function showTooltipAt(e: React.MouseEvent<SVGRectElement>, text: string) {
        setTooltip({
            x: e.clientX + 12,
            y: e.clientY + 12,
            text,
        });
    }

    function hideTooltip() {
        setTooltip(null);
    }

    const { bars, xScale, yScale, xTicks } = useMemo(() => {
        const projected = data
            .map((d, i) => ({
                // IMPORTANT: default key is index, but duplicates happen easily if you use label as key.
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

        const xMax = xDomain?.[1] ?? d3.max(sliced, (d) => d.value) ?? 1;

        const xScale = d3.scaleLinear(xDomain ?? [0, xMax], [
            marginLeft,
            width - marginRight,
        ]);

        // If labels repeat, scaleBand domain will collapse duplicates.
        // We solve this by using unique ids for the band scale domain.
        const bandIds = sliced.map((d) => d.key);

        const yScale = d3
            .scaleBand<string>()
            .domain(bandIds)
            .range([marginTop, height - marginBottom])
            .padding(0.2);

        const xTicks = xScale.ticks(5).map((t) => ({ t, x: xScale(t) }));

        return { bars: sliced, xScale, yScale, xTicks };
    }, [
        data,
        keyFn,
        label,
        value,
        sortDescending,
        maxBars,
        xDomain,
        width,
        height,
        marginLeft,
        marginRight,
        marginTop,
        marginBottom,
    ]);

    return (
        <>
            <svg width={width} height={height} className={className}>
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
                        {/* X axis */}
                        <line
                            x1={marginLeft}
                            x2={width - marginRight}
                            y1={height - marginBottom}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {xTicks.map(({ t, x }) => (
                            <g key={`xt-${t}`} transform={`translate(${x},${height - marginBottom})`}>
                                <line y2={6} stroke="currentColor" />
                                <text y={16} textAnchor="middle">
                                    {t}
                                </text>
                            </g>
                        ))}
                    </g>
                )}

                {/* Bars */}
                {bars.map((b) => {
                    const y = yScale(b.key);
                    if (y == null) return null;

                    const w = xScale(b.value) - xScale(0);
                    const hoverable = Boolean(barTitle);
                    const text = barTitle ? barTitle(b.raw, b.i) : "";

                    return (
                        <g key={b.key}>
                            {/* Left label */}
                            <text
                                x={marginLeft - 10}
                                y={y + yScale.bandwidth() / 2}
                                dy="0.32em"
                                textAnchor="end"
                                fontSize={10}
                            >
                                {b.label}
                            </text>

                            {/* Bar rect */}
                            <rect
                                x={xScale(0)}
                                y={y}
                                width={Math.max(0, w)}
                                height={yScale.bandwidth()}
                                fill={barFill}
                                style={{ cursor: hoverable ? "help" : "default" }}
                                onMouseMove={hoverable ? (e) => showTooltipAt(e, text) : undefined}
                                onMouseLeave={hoverable ? hideTooltip : undefined}
                            />

                            {/* Value label on right */}
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

            {/* Tooltip (reliable hover tooltip instead of SVG <title>) */}
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