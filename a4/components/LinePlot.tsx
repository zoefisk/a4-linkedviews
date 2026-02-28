"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { brushX } from "d3-brush";
import { select } from "d3-selection";
import CustomTooltip, { TooltipState } from "@/components/ToolTip";

/* ============================== TYPES ============================== */

type Accessor<T> = (d: T, i: number) => number;

export type BrushSelection = {
    x: [number, number] | null;
    y: null;
};

export interface LinePlotProps<T> {
    data: T[];

    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    title?: string;
    xLabel?: string;
    yLabel?: string;

    x?: Accessor<T>;
    y?: Accessor<T>;

    showPoints?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;

    stroke?: string;
    strokeWidth?: number;

    /** Constant point radius (kept simple) */
    pointRadius?: number;

    /** Tooltip text for each point */
    pointTitle?: (d: T, i: number) => string;

    enableBrush?: boolean;

    /** Snap to discrete X values (years) */
    enableSnap?: boolean;
    snapXValues?: number[];

    onBrushChange?: (sel: BrushSelection) => void;

    /** ✅ NEW: highlight a particular X value (e.g. a hovered year) */
    highlightX?: number | null;
}

/* ============================== HELPERS ============================== */

function ordered(a: number, b: number): [number, number] {
    return a <= b ? [a, b] : [b, a];
}

function snapToList(v: number, values: number[]) {
    let best = values[0];
    let bestDist = Math.abs(v - best);
    for (const t of values) {
        const d = Math.abs(v - t);
        if (d < bestDist) {
            best = t;
            bestDist = d;
        }
    }
    return best;
}

function approxEqual(a: number, b: number, eps = 0.5) {
    return Math.abs(a - b) <= eps;
}

/* ============================== COMPONENT ============================== */

export default function LinePlot<T>({
                                        data,
                                        width = 900,
                                        height = 420,
                                        marginTop = 64,
                                        marginRight = 32,
                                        marginBottom = 56,
                                        marginLeft = 72,

                                        title,
                                        xLabel,
                                        yLabel,

                                        x,
                                        y,

                                        showPoints = true,
                                        showAxes = true,
                                        showGrid = true,

                                        stroke = "black",
                                        strokeWidth = 1.5,
                                        pointRadius = 3,

                                        pointTitle,

                                        enableBrush = false,
                                        enableSnap = false,
                                        snapXValues,

                                        onBrushChange,

                                        highlightX = null,
                                    }: LinePlotProps<T>) {
    const clipId = useId();
    const brushRef = useRef<SVGGElement | null>(null);
    const programmaticMoveRef = useRef(false);

    // ✅ custom tooltip (instant)
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const xAcc: Accessor<T> = x ?? ((_, i) => i);
    const yAcc: Accessor<T> = y ?? ((d: any) => d as number);

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    /* ============================== SCALES ============================== */

    const { xScale, yScale, pathD, points, xTicks, yTicks } = useMemo(() => {
        const xs = data.map((d, i) => xAcc(d, i));
        const ys = data.map((d, i) => yAcc(d, i));

        const [xMin, xMax] = d3.extent(xs) as [number, number];
        const [yMin, yMax] = d3.extent(ys) as [number, number];

        // ---- DOMAIN PADDING (fixes cut-off dots) ----
        const xPad =
            snapXValues && snapXValues.length > 1
                ? Math.abs(snapXValues[1] - snapXValues[0]) / 2
                : (xMax - xMin) * 0.02 || 1;

        const yPad = (yMax - yMin) * 0.05 || 0.5;

        const xScale = d3.scaleLinear(
            [xMin - xPad, xMax + xPad],
            [marginLeft, width - marginRight]
        );

        const yScale = d3.scaleLinear(
            [yMin - yPad, yMax + yPad],
            [height - marginBottom, marginTop]
        );

        const line = d3
            .line<T>()
            .x((d, i) => xScale(xAcc(d, i)))
            .y((d, i) => yScale(yAcc(d, i)));

        return {
            xScale,
            yScale,
            pathD: line(data) ?? "",
            points: data.map((d, i) => ({
                i,
                x: xScale(xAcc(d, i)),
                y: yScale(yAcc(d, i)),
                raw: d,
                xVal: xAcc(d, i),
            })),
            xTicks: xScale.ticks(8),
            yTicks: yScale.ticks(6),
        };
    }, [
        data,
        xAcc,
        yAcc,
        width,
        height,
        marginLeft,
        marginRight,
        marginTop,
        marginBottom,
        snapXValues,
    ]);

    /* ============================== BRUSH + SNAP ============================== */

    useEffect(() => {
        if (!enableBrush || !brushRef.current) return;

        const g = select(brushRef.current);

        const extent: [[number, number], [number, number]] = [
            [marginLeft, marginTop],
            [width - marginRight, height - marginBottom],
        ];

        const b = brushX().extent(extent);

        function emit(selPx: [number, number] | null) {
            if (!selPx) {
                onBrushChange?.({ x: null, y: null });
                return;
            }

            let [d0, d1] = ordered(xScale.invert(selPx[0]), xScale.invert(selPx[1]));

            if (enableSnap && snapXValues?.length) {
                d0 = snapToList(d0, snapXValues);
                d1 = snapToList(d1, snapXValues);
            }

            onBrushChange?.({ x: [d0, d1], y: null });
        }

        function maybeSnapMove(selPx: [number, number] | null) {
            if (!selPx) return;
            if (!enableSnap || !snapXValues?.length) return;

            const [d0raw, d1raw] = ordered(
                xScale.invert(selPx[0]),
                xScale.invert(selPx[1])
            );
            const d0 = snapToList(d0raw, snapXValues);
            const d1 = snapToList(d1raw, snapXValues);

            const px0 = xScale(d0);
            const px1 = xScale(d1);

            if (approxEqual(selPx[0], px0) && approxEqual(selPx[1], px1)) return;

            programmaticMoveRef.current = true;
            g.call(b.move as any, ordered(px0, px1));
            programmaticMoveRef.current = false;
        }

        b.on("brush", (e: any) => {
            if (programmaticMoveRef.current) return;
            emit(e.selection);
        });

        b.on("end", (e: any) => {
            if (programmaticMoveRef.current) return;
            maybeSnapMove(e.selection);
            emit(e.selection);
        });

        g.call(b as any);

        g.on("dblclick", () => {
            programmaticMoveRef.current = true;
            g.call(b.move as any, null);
            programmaticMoveRef.current = false;
            emit(null);
        });

        return () => {
            g.on("dblclick", null);
            g.selectAll("*").remove();
        };
    }, [
        enableBrush,
        enableSnap,
        snapXValues,
        xScale,
        width,
        height,
        marginLeft,
        marginRight,
        marginTop,
        marginBottom,
        onBrushChange,
    ]);

    /* ============================== TOOLTIP HELPERS ============================== */

    function showTooltip(e: React.PointerEvent<SVGCircleElement>, text: string) {
        setTooltip({ x: e.clientX, y: e.clientY, text });
    }
    function moveTooltip(e: React.PointerEvent<SVGCircleElement>, text: string) {
        setTooltip({ x: e.clientX, y: e.clientY, text });
    }
    function hideTooltip() {
        setTooltip(null);
    }

    /* ============================== RENDER ============================== */

    return (
        <>
            <svg width={width} height={height}>
                {title && (
                    <text x={width / 2} y={28} textAnchor="middle" fontSize={16} fontWeight={600}>
                        {title}
                    </text>
                )}

                {showGrid && (
                    <g opacity={0.25}>
                        {xTicks.map((t) => (
                            <line
                                key={`xg-${t}`}
                                x1={xScale(t)}
                                x2={xScale(t)}
                                y1={marginTop}
                                y2={height - marginBottom}
                                stroke="currentColor"
                            />
                        ))}
                        {yTicks.map((t) => (
                            <line
                                key={`yg-${t}`}
                                y1={yScale(t)}
                                y2={yScale(t)}
                                x1={marginLeft}
                                x2={width - marginRight}
                                stroke="currentColor"
                            />
                        ))}
                    </g>
                )}

                {showAxes && (
                    <g fontSize={10}>
                        <line
                            x1={marginLeft}
                            x2={width - marginRight}
                            y1={height - marginBottom}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {xTicks.map((t) => (
                            <g key={`xt-${t}`} transform={`translate(${xScale(t)},${height - marginBottom})`}>
                                <line y2={6} stroke="currentColor" />
                                <text y={18} textAnchor="middle">
                                    {t}
                                </text>
                            </g>
                        ))}
                        {xLabel && (
                            <text x={width / 2} y={height - 8} textAnchor="middle" fontSize={12}>
                                {xLabel}
                            </text>
                        )}

                        <line
                            x1={marginLeft}
                            x2={marginLeft}
                            y1={marginTop}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {yTicks.map((t) => (
                            <g key={`yt-${t}`} transform={`translate(${marginLeft},${yScale(t)})`}>
                                <line x2={-6} stroke="currentColor" />
                                <text x={-10} dy="0.32em" textAnchor="end">
                                    {t}
                                </text>
                            </g>
                        ))}
                        {yLabel && (
                            <text
                                transform={`translate(20 ${height / 2}) rotate(-90)`}
                                textAnchor="middle"
                                fontSize={12}
                            >
                                {yLabel}
                            </text>
                        )}
                    </g>
                )}

                <defs>
                    <clipPath id={clipId}>
                        <rect x={marginLeft} y={marginTop} width={innerWidth} height={innerHeight} />
                    </clipPath>
                </defs>

                {/* Brush BELOW points so hover still works */}
                {enableBrush && <g ref={brushRef} />}

                <g clipPath={`url(#${clipId})`}>
                    <path d={pathD} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

                    {showPoints &&
                        points.map((p) => {
                            const text = pointTitle ? pointTitle(p.raw, p.i) : "";
                            const hoverable = Boolean(pointTitle);

                            const isHighlighted =
                                highlightX != null && approxEqual(p.xVal, highlightX, 0.0001);

                            return (
                                <circle
                                    key={p.i}
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHighlighted ? pointRadius + 2 : pointRadius}
                                    fill={isHighlighted ? "black" : "white"}
                                    stroke={isHighlighted ? "black" : "black"}
                                    strokeWidth={isHighlighted ? 2 : 1}
                                    style={{ cursor: hoverable ? "help" : "default" }}
                                    onPointerEnter={hoverable ? (e) => showTooltip(e, text) : undefined}
                                    onPointerMove={hoverable ? (e) => moveTooltip(e, text) : undefined}
                                    onPointerLeave={hoverable ? hideTooltip : undefined}
                                />
                            );
                        })}
                </g>
            </svg>

            <CustomTooltip tooltip={tooltip} />
        </>
    );
}