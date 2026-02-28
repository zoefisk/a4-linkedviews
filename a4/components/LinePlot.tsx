// src/components/LinePlot.tsx

"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { brushX } from "d3-brush";
import { select } from "d3-selection";
import CustomTooltip, { TooltipState } from "@/components/ToolTip";

/* =============================================================================
   Types
   ============================================================================= */

/**
 * Numeric accessor for x/y values.
 * @template T - The datum type.
 */
type Accessor<T> = (d: T, i: number) => number;

/**
 * Brush selection reported to the parent.
 * - x: selected domain range (or null if cleared)
 * - y: always null (this component currently supports brushX only)
 */
export type BrushSelection = {
    x: [number, number] | null;
    y: null;
};

export interface LinePlotProps<T> {
    /** Input data array. */
    data: T[];

    /** Overall svg dimensions. */
    width?: number;
    height?: number;

    /** Plot margins (space for axes and labels). */
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    /** Optional chart title and axis labels. */
    title?: string;
    xLabel?: string;
    yLabel?: string;

    /** Accessors (defaults: x=index, y=value). */
    x?: Accessor<T>;
    y?: Accessor<T>;

    /** Visual toggles. */
    showPoints?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;

    /** Line styling. */
    stroke?: string;
    strokeWidth?: number;

    /** Constant point radius (kept simple). */
    pointRadius?: number;

    /** Tooltip text shown when hovering a point. */
    pointTitle?: (d: T, i: number) => string;

    /** Enable x-axis brushing. */
    enableBrush?: boolean;

    /** Snap brush selection to discrete x-values (e.g., years). */
    enableSnap?: boolean;

    /** Discrete x-values used by snapping logic (e.g., list of years). */
    snapXValues?: number[];

    /** Brush callback. Called during brush and after brush end. */
    onBrushChange?: (sel: BrushSelection) => void;

    /**
     * Highlight a particular X value (e.g. the year corresponding to a hovered bar).
     * When set, the nearest (approxEqual) point receives stronger styling.
     */
    highlightX?: number | null;
}

/* =============================================================================
   Helpers
   ============================================================================= */

/** Returns [min,max] ordering for two numbers. */
function ordered(a: number, b: number): [number, number] {
    return a <= b ? [a, b] : [b, a];
}

/**
 * Snap a value to the closest element in a list.
 * Assumes `values` is non-empty.
 */
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

/** Approximate equality helper to avoid jitter / recursive brush moves. */
function approxEqual(a: number, b: number, eps = 0.5) {
    return Math.abs(a - b) <= eps;
}

/* =============================================================================
   Component
   ============================================================================= */

/**
 * LinePlot
 *
 * - Renders: grid, axes, a line, optional points
 * - Interaction: brushX with optional snapping
 * - Tooltip: instant custom tooltip on points
 * - Linking: `highlightX` emphasizes a point for cross-view linking
 *
 * Notes:
 * - Brush is rendered BEFORE points so circles stay clickable/hoverable.
 * - Brush snapping uses a "programmaticMoveRef" guard to prevent recursion.
 */
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

    /** Ref to the brush layer <g>. */
    const brushRef = useRef<SVGGElement | null>(null);

    /**
     * When we move the brush programmatically (snap), ignore brush events
     * to prevent an infinite loop and jitter.
     */
    const programmaticMoveRef = useRef(false);

    /** Tooltip state for the custom overlay component. */
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    /** Default accessors. */
    const xAcc: Accessor<T> = x ?? ((_, i) => i);
    const yAcc: Accessor<T> = y ?? ((d: any) => d as number);

    /** Inner plot area (used for the clip rect). */
    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    /* -------------------------------------------------------------------------
       Scales + geometry
       ------------------------------------------------------------------------- */

    const { xScale, yScale, pathD, points, xTicks, yTicks } = useMemo(() => {
        const xs = data.map((d, i) => xAcc(d, i));
        const ys = data.map((d, i) => yAcc(d, i));

        const [xMin, xMax] = d3.extent(xs) as [number, number];
        const [yMin, yMax] = d3.extent(ys) as [number, number];

        // Domain padding prevents endpoint dots from being clipped.
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

    /* -------------------------------------------------------------------------
       Brush + snap logic
       ------------------------------------------------------------------------- */

    useEffect(() => {
        if (!enableBrush || !brushRef.current) return;

        const g = select(brushRef.current);

        // Brush extent is the chart drawing region.
        const extent: [[number, number], [number, number]] = [
            [marginLeft, marginTop],
            [width - marginRight, height - marginBottom],
        ];

        const b = brushX().extent(extent);

        /**
         * Emit selection in *domain* units (not pixels), with optional snapping.
         */
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

        /**
         * Visually snap the brush handles to the nearest discrete x-values.
         * Guarded to avoid infinite brush recursion.
         */
        function maybeSnapMove(selPx: [number, number] | null) {
            if (!selPx) return;
            if (!enableSnap || !snapXValues?.length) return;

            const [d0raw, d1raw] = ordered(xScale.invert(selPx[0]), xScale.invert(selPx[1]));
            const d0 = snapToList(d0raw, snapXValues);
            const d1 = snapToList(d1raw, snapXValues);

            const px0 = xScale(d0);
            const px1 = xScale(d1);

            // Avoid tiny moves that cause jitter.
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

        // Initialize brush.
        g.call(b as any);

        // Double-click clears selection.
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

    /* -------------------------------------------------------------------------
       Tooltip handlers
       ------------------------------------------------------------------------- */

    function showTooltip(e: React.PointerEvent<SVGCircleElement>, text: string) {
        setTooltip({ x: e.clientX, y: e.clientY, text });
    }
    function moveTooltip(e: React.PointerEvent<SVGCircleElement>, text: string) {
        setTooltip({ x: e.clientX, y: e.clientY, text });
    }
    function hideTooltip() {
        setTooltip(null);
    }

    /* -------------------------------------------------------------------------
       Render
       ------------------------------------------------------------------------- */

    return (
        <>
            <svg width={width} height={height}>
                {/* Title */}
                {title && (
                    <text
                        x={width / 2}
                        y={28}
                        textAnchor="middle"
                        fontSize={16}
                        fontWeight={600}
                    >
                        {title}
                    </text>
                )}

                {/* Grid lines */}
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

                {/* Axes + labels */}
                {showAxes && (
                    <g fontSize={10}>
                        {/* X axis baseline */}
                        <line
                            x1={marginLeft}
                            x2={width - marginRight}
                            y1={height - marginBottom}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {xTicks.map((t) => (
                            <g
                                key={`xt-${t}`}
                                transform={`translate(${xScale(t)},${height - marginBottom})`}
                            >
                                <line y2={6} stroke="currentColor" />
                                <text y={18} textAnchor="middle">
                                    {t}
                                </text>
                            </g>
                        ))}
                        {xLabel && (
                            <text
                                x={width / 2}
                                y={height - 8}
                                textAnchor="middle"
                                fontSize={12}
                            >
                                {xLabel}
                            </text>
                        )}

                        {/* Y axis baseline */}
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

                {enableBrush && <g ref={brushRef} />}

                {/* Main marks */}
                <g clipPath={`url(#${clipId})`}>
                    {/* Line */}
                    <path d={pathD} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

                    {/* Points */}
                    {showPoints &&
                        points.map((p) => {
                            const text = pointTitle ? pointTitle(p.raw, p.i) : "";
                            const hoverable = Boolean(pointTitle);

                            // Highlight logic for linked views (hovered bar -> year point)
                            const isHighlighted =
                                highlightX != null && approxEqual(p.xVal, highlightX, 0.0001);

                            return (
                                <circle
                                    key={p.i}
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHighlighted ? pointRadius + 2 : pointRadius}
                                    fill={isHighlighted ? "black" : "white"}
                                    stroke="black"
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

            {/* Tooltip overlay lives outside svg so it can use fixed positioning */}
            <CustomTooltip tooltip={tooltip} />
        </>
    );
}