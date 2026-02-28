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

    xDomain?: [number, number];
    sortDescending?: boolean;
    maxBars?: number;

    showAxes?: boolean;
    showGrid?: boolean;

    barFill?: string;
    barTitle?: (d: T, i: number) => string;

    /** Titles / axis labels */
    title?: string;
    xLabel?: string;
    yLabel?: string;

    className?: string;
}

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
                                                  title,
                                                  xLabel,
                                                  yLabel,
                                                  className,
                                              }: HorizontalBarChartProps<T>) {
    const [tooltip, setTooltip] = React.useState<{ x: number; y: number; text: string } | null>(null);

    function showTooltipAt(e: React.MouseEvent<SVGRectElement>, text: string) {
        setTooltip({ x: e.clientX + 12, y: e.clientY + 12, text });
    }
    function hideTooltip() {
        setTooltip(null);
    }

    const { bars, xScale, yScale, xTicks } = useMemo(() => {
        const projected = data
            .map((d, i) => ({
                key: keyFn ? keyFn(d, i) : String(i),
                raw: d,
                label: label(d, i),
                value: value(d, i),
                i,
            }))
            .filter((d) => Number.isFinite(d.value));

        const sorted = sortDescending ? [...projected].sort((a, b) => b.value - a.value) : projected;
        const sliced = typeof maxBars === "number" ? sorted.slice(0, maxBars) : sorted;

        const xMax = xDomain?.[1] ?? d3.max(sliced, (d) => d.value) ?? 1;

        const xScale = d3.scaleLinear(xDomain ?? [0, xMax], [marginLeft, width - marginRight]);

        const bandIds = sliced.map((d) => d.key);
        const yScale = d3
            .scaleBand<string>()
            .domain(bandIds)
            .range([marginTop, height - marginBottom])
            .padding(0.2);

        const xTicks = xScale.ticks(5).map((t) => ({ t, x: xScale(t) }));
        return { bars: sliced, xScale, yScale, xTicks };
    }, [data, keyFn, label, value, sortDescending, maxBars, xDomain, width, height, marginLeft, marginRight, marginTop, marginBottom]);

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
                        fontFamily='ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
                    >
                        {title}
                    </text>
                )}

                {/* Grid */}
                {showGrid && (
                    <g opacity={0.2}>
                        {xTicks.map(({ t, x }) => (
                            <line key={`gx-${t}`} x1={x} x2={x} y1={marginTop} y2={height - marginBottom} stroke="currentColor" />
                        ))}
                    </g>
                )}

                {/* Axes */}
                {showAxes && (
                    <g fontSize={10} fill="currentColor">
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

                {/* Axis labels */}
                {xLabel && (
                    <text
                        x={(marginLeft + (width - marginRight)) / 2}
                        y={height - 4}
                        textAnchor="middle"
                        fontSize={12}
                        opacity={0.8}
                        fontFamily='ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
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
                        fontFamily='ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
                    >
                        {yLabel}
                    </text>
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
                            <text x={marginLeft - 10} y={y + yScale.bandwidth() / 2} dy="0.32em" textAnchor="end" fontSize={10}>
                                {b.label}
                            </text>

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

                            <text x={xScale(b.value) + 6} y={y + yScale.bandwidth() / 2} dy="0.32em" fontSize={10}>
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