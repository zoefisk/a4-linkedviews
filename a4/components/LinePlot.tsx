// src/components/LinePlot.tsx
"use client";

import React, { useEffect, useId, useMemo, useRef } from "react";
import * as d3 from "d3";
import { brush, brushX, brushY, BrushBehavior } from "d3-brush";
import { select } from "d3-selection";

/* ============================== TYPES ============================== */

type Accessor<T> = (d: T, i: number) => number;

export type BrushMode = "x" | "y" | "xy";

export type BrushSelection = {
    x: [number, number] | null;
    y: [number, number] | null;
};

export interface LinePlotProps<T> {
    data: T[];

    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    x?: Accessor<T>;
    y?: Accessor<T>;

    showPoints?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;

    stroke?: string;
    strokeWidth?: number;
    pointRadius?: number;

    pointTitle?: (d: T, i: number) => string;

    enableBrush?: boolean;
    brushMode?: BrushMode;

    /** Snap domain values (ex: years) */
    enableSnap?: boolean;
    xStep?: number;
    yStep?: number;

    onBrushChange?: (sel: BrushSelection) => void;
}

/* ============================== HELPERS ============================== */

function ordered(a: number, b: number): [number, number] {
    return a <= b ? [a, b] : [b, a];
}

function snap(v: number, step: number) {
    return step > 0 ? Math.round(v / step) * step : v;
}

function domainsEqual(a: BrushSelection, b: BrushSelection) {
    return (
        JSON.stringify(a.x) === JSON.stringify(b.x) &&
        JSON.stringify(a.y) === JSON.stringify(b.y)
    );
}

/* ============================== COMPONENT ============================== */

export default function LinePlot<T>({
                                        data,
                                        width = 800,
                                        height = 400,
                                        marginTop = 20,
                                        marginRight = 20,
                                        marginBottom = 30,
                                        marginLeft = 40,

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
                                        brushMode = "x",

                                        enableSnap = false,
                                        xStep = 1,
                                        yStep = 1,

                                        onBrushChange,
                                    }: LinePlotProps<T>) {
    const clipId = useId();
    const brushRef = useRef<SVGGElement | null>(null);

    /** IMPORTANT: last emitted domain */
    const lastEmittedRef = useRef<BrushSelection>({
        x: null,
        y: null,
    });

    const xAcc: Accessor<T> = x ?? ((_, i) => i);
    const yAcc: Accessor<T> = y ?? ((d: any) => d as number);

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    /* ============================== SCALES ============================== */

    const { xScale, yScale, pathD, points, xTicks, yTicks } = useMemo(() => {
        const xs = data.map((d, i) => xAcc(d, i));
        const ys = data.map((d, i) => yAcc(d, i));

        const xDomain = (d3.extent(xs) as [number, number]) ?? [0, 1];
        const yDomain = (d3.extent(ys) as [number, number]) ?? [0, 1];

        // Avoid zero-span domains (can break scales/ticks)
        const fixDomain = (dom: [number, number]) =>
            dom[0] === dom[1] ? ([dom[0] - 1, dom[1] + 1] as [number, number]) : dom;

        const xScale = d3.scaleLinear(fixDomain(xDomain), [
            marginLeft,
            width - marginRight,
        ]);
        const yScale = d3.scaleLinear(fixDomain(yDomain), [
            height - marginBottom,
            marginTop,
        ]);

        const line = d3
            .line<T>()
            .x((d, i) => xScale(xAcc(d, i)))
            .y((d, i) => yScale(yAcc(d, i)));

        const xTicks = xScale.ticks(6).map((t) => ({ t, px: xScale(t) }));
        const yTicks = yScale.ticks(6).map((t) => ({ t, py: yScale(t) }));

        return {
            xScale,
            yScale,
            pathD: line(data) ?? "",
            points: data.map((d, i) => ({
                i,
                x: xScale(xAcc(d, i)),
                y: yScale(yAcc(d, i)),
                raw: d,
            })),
            xTicks,
            yTicks,
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
    ]);

    /* ============================== BRUSH ============================== */

    useEffect(() => {
        if (!enableBrush || !brushRef.current) return;

        console.log("[LinePlot] initializing brush");

        const g = select(brushRef.current);

        const extent: [[number, number], [number, number]] = [
            [marginLeft, marginTop],
            [width - marginRight, height - marginBottom],
        ];

        let b: BrushBehavior<any>;

        if (brushMode === "x") b = brushX();
        else if (brushMode === "y") b = brushY();
        else b = brush();

        b.extent(extent);

        function readAndEmit(selPx: any, phase: string) {
            console.log(`[LinePlot] readAndEmit(${phase})`, selPx);

            if (!selPx) {
                const cleared: BrushSelection = { x: null, y: null };
                if (!domainsEqual(lastEmittedRef.current, cleared)) {
                    lastEmittedRef.current = cleared;
                    onBrushChange?.(cleared);
                }
                return;
            }

            let next: BrushSelection = { x: null, y: null };

            if (brushMode === "x") {
                const [p0, p1] = selPx as [number, number];
                let [d0, d1] = ordered(xScale.invert(p0), xScale.invert(p1));

                if (enableSnap) {
                    d0 = snap(d0, xStep);
                    d1 = snap(d1, xStep);
                }

                next.x = [d0, d1];
            } else if (brushMode === "y") {
                const [p0, p1] = selPx as [number, number];
                let [d0, d1] = ordered(yScale.invert(p0), yScale.invert(p1));

                if (enableSnap) {
                    d0 = snap(d0, yStep);
                    d1 = snap(d1, yStep);
                }

                next.y = [d0, d1];
            } else {
                const [[px0, py0], [px1, py1]] = selPx as [
                    [number, number],
                    [number, number]
                ];

                let [x0, x1] = ordered(xScale.invert(px0), xScale.invert(px1));
                let [y0, y1] = ordered(yScale.invert(py0), yScale.invert(py1));

                if (enableSnap) {
                    x0 = snap(x0, xStep);
                    x1 = snap(x1, xStep);
                    y0 = snap(y0, yStep);
                    y1 = snap(y1, yStep);
                }

                next = { x: [x0, x1], y: [y0, y1] };
            }

            if (!domainsEqual(lastEmittedRef.current, next)) {
                console.log("[LinePlot] emit", next);
                lastEmittedRef.current = next;
                onBrushChange?.(next);
            }
        }

        b.on("start", (e: any) => readAndEmit(e.selection, "start"));
        b.on("brush", (e: any) => readAndEmit(e.selection, "brush"));
        b.on("end", (e: any) => readAndEmit(e.selection, "end"));

        g.call(b as any);

        return () => {
            console.log("[LinePlot] cleanup brush");
            g.selectAll("*").remove();
        };
    }, [
        enableBrush,
        brushMode,
        enableSnap,
        xStep,
        yStep,
        xScale,
        yScale,
        width,
        height,
        marginLeft,
        marginRight,
        marginTop,
        marginBottom,
        onBrushChange,
    ]);

    /* ============================== RENDER ============================== */

    return (
        <svg width={width} height={height}>
            <defs>
                <clipPath id={clipId}>
                    <rect
                        x={marginLeft}
                        y={marginTop}
                        width={innerWidth}
                        height={innerHeight}
                    />
                </clipPath>
            </defs>

            {/* Grid */}
            {showGrid && (
                <g opacity={0.25}>
                    {xTicks.map(({ t, px }) => (
                        <line
                            key={`gx-${t}`}
                            x1={px}
                            x2={px}
                            y1={marginTop}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                    ))}
                    {yTicks.map(({ t, py }) => (
                        <line
                            key={`gy-${t}`}
                            x1={marginLeft}
                            x2={width - marginRight}
                            y1={py}
                            y2={py}
                            stroke="currentColor"
                        />
                    ))}
                </g>
            )}

            {/* Axes + tick labels */}
            {showAxes && (
                <g fontSize={10} fill="currentColor">
                    {/* X axis baseline */}
                    <line
                        x1={marginLeft}
                        x2={width - marginRight}
                        y1={height - marginBottom}
                        y2={height - marginBottom}
                        stroke="currentColor"
                    />
                    {xTicks.map(({ t, px }) => (
                        <g
                            key={`xt-${t}`}
                            transform={`translate(${px}, ${height - marginBottom})`}
                        >
                            <line y2={6} stroke="currentColor" />
                            <text y={16} textAnchor="middle">
                                {t}
                            </text>
                        </g>
                    ))}

                    {/* Y axis baseline */}
                    <line
                        x1={marginLeft}
                        x2={marginLeft}
                        y1={marginTop}
                        y2={height - marginBottom}
                        stroke="currentColor"
                    />
                    {yTicks.map(({ t, py }) => (
                        <g key={`yt-${t}`} transform={`translate(${marginLeft}, ${py})`}>
                            <line x2={-6} stroke="currentColor" />
                            <text x={-10} dy="0.32em" textAnchor="end">
                                {t}
                            </text>
                        </g>
                    ))}
                </g>
            )}

            {/* Plot */}
            <g clipPath={`url(#${clipId})`}>
                <path d={pathD} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

                {showPoints &&
                    points.map((p) => (
                        <circle
                            key={p.i}
                            cx={p.x}
                            cy={p.y}
                            r={pointRadius}
                            fill="white"
                            stroke="black"
                        >
                            {pointTitle ? <title>{pointTitle(p.raw, p.i)}</title> : null}
                        </circle>
                    ))}
            </g>

            {/* Brush overlay */}
            {enableBrush && <g ref={brushRef} />}
        </svg>
    );
}