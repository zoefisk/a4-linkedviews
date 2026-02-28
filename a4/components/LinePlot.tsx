// src/components/LinePlot.tsx
"use client";

import * as d3 from "d3";
import React, { useEffect, useId, useMemo, useRef } from "react";

/**
 * Accessor that returns a numeric value for a datum.
 */
type Accessor<T> = (d: T, i: number) => number;

export type BrushMode = "x" | "y" | "xy";
export type BrushPlacement = "plot" | "xBand" | "yBand";

/**
 * Payload sent to onBrushChange.
 * - x: brushed x-domain [lo, hi] or null if cleared / not applicable
 * - y: brushed y-domain [lo, hi] or null if cleared / not applicable
 */
export type BrushSelectionDomain = {
    x: [number, number] | null;
    y: [number, number] | null;
};

export interface LinePlotProps<T> {
    /** Series data */
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

    /** X accessor (defaults to index) */
    x?: Accessor<T>;
    /** Y accessor (defaults to numeric datum) */
    y?: Accessor<T>;

    /** Optional fixed x domain */
    xDomain?: [number, number];
    /** Optional fixed y domain */
    yDomain?: [number, number];

    /** Toggle point markers */
    showPoints?: boolean;
    /** Toggle axes */
    showAxes?: boolean;
    /** Toggle grid */
    showGrid?: boolean;

    /** Line stroke */
    stroke?: string;
    /** Line stroke width */
    strokeWidth?: number;

    /** Point radius */
    pointRadius?: number;
    /** Point fill */
    pointFill?: string;
    /** Point stroke */
    pointStroke?: string;

    /** Tooltip content for points */
    pointTitle?: (d: T, i: number) => string;

    className?: string;

    // ---------------------------
    // Brushing (OPTIONAL)
    // ---------------------------

    /**
     * Enable brushing overlay (default: false).
     */
    enableBrush?: boolean;

    /**
     * Brush mode:
     * - "x": horizontal brushing
     * - "y": vertical brushing
     * - "xy": 2D rectangular brushing
     */
    brushMode?: BrushMode;

    /**
     * Brush placement:
     * - "plot": full plot area (recommended)
     * - "xBand": thin band near x-axis
     * - "yBand": thin band near y-axis
     */
    brushPlacement?: BrushPlacement;

    /**
     * Size of xBand (height) or yBand (width), in px.
     * Only used when brushPlacement is xBand/yBand.
     */
    brushBandSize?: number;

    /**
     * Snap increment for X domain.
     * - 1 => snap to whole years
     * - 5 => snap to 5-year increments
     * - null/0 => no snapping (free-form)
     */
    snapX?: number | null;

    /**
     * Snap increment for Y domain.
     * - e.g. 0.5 => snap to half-point ratings
     * - null/0 => no snapping (free-form)
     */
    snapY?: number | null;

    /**
     * If true, render value labels on the brush selection (start/end).
     */
    showBrushValues?: boolean;

    /**
     * Optional formatting for brush labels.
     * Defaults to simple numeric formatting.
     */
    formatBrushX?: (v: number) => string;
    formatBrushY?: (v: number) => string;

    /**
     * Called on brush move/end with domain values.
     * If the brush is cleared, emits {x:null,y:null}.
     */
    onBrushChange?: (sel: BrushSelectionDomain) => void;

    /**
     * (Optional future) Controlled brush selection.
     * Not used yet, but safe to keep.
     */
    brushedXDomain?: [number, number] | null;
    brushedYDomain?: [number, number] | null;
}

export default function LinePlot<T>({
                                        data,
                                        width = 640,
                                        height = 400,
                                        marginTop = 20,
                                        marginRight = 20,
                                        marginBottom = 30,
                                        marginLeft = 40,

                                        x,
                                        y,

                                        xDomain,
                                        yDomain,

                                        showPoints = true,
                                        showAxes = true,
                                        showGrid = false,

                                        stroke = "currentColor",
                                        strokeWidth = 1.5,
                                        pointRadius = 2.5,
                                        pointFill = "white",
                                        pointStroke = "currentColor",

                                        pointTitle,
                                        className,

                                        enableBrush = false,
                                        brushMode = "x",
                                        brushPlacement = "plot",
                                        brushBandSize = 28,
                                        snapX = null,
                                        snapY = null,
                                        showBrushValues = false,
                                        formatBrushX,
                                        formatBrushY,
                                        onBrushChange,
                                    }: LinePlotProps<T>) {
    const clipId = useId();
    const brushGRef = useRef<SVGGElement | null>(null);

    // Keep latest callback without forcing brush re-init on every render.
    const onBrushChangeRef = useRef<typeof onBrushChange>(onBrushChange);
    useEffect(() => {
        onBrushChangeRef.current = onBrushChange;
    }, [onBrushChange]);

    // Tooltip state (for point hover)
    const [tooltip, setTooltip] = React.useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);

    const xAcc: Accessor<T> = x ?? ((_, i) => i);
    const yAcc: Accessor<T> = y ?? ((d: any) => d as number);

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    const { xScale, yScale, pathD, points } = useMemo(() => {
        const xs = data.map((d, i) => xAcc(d, i));
        const ys = data.map((d, i) => yAcc(d, i));

        const xd = xDomain ?? ((d3.extent(xs) as [number, number] | null) ?? [0, 1]);
        const yd = yDomain ?? ((d3.extent(ys) as [number, number] | null) ?? [0, 1]);

        const fixDomain = (dom: [number, number]) =>
            dom[0] === dom[1] ? ([dom[0] - 1, dom[1] + 1] as [number, number]) : dom;

        const xScale = d3.scaleLinear(fixDomain(xd), [marginLeft, width - marginRight]);
        const yScale = d3.scaleLinear(fixDomain(yd), [height - marginBottom, marginTop]);

        const line = d3
            .line<T>()
            .x((d, i) => xScale(xAcc(d, i)))
            .y((d, i) => yScale(yAcc(d, i)));

        const pathD = line(data) ?? "";

        const points = data.map((d, i) => ({
            i,
            x: xScale(xAcc(d, i)),
            y: yScale(yAcc(d, i)),
            raw: d,
        }));

        return { xScale, yScale, pathD, points };
    }, [
        data,
        xAcc,
        yAcc,
        xDomain,
        yDomain,
        width,
        height,
        marginLeft,
        marginRight,
        marginTop,
        marginBottom,
    ]);

    const xTicks = useMemo(() => xScale.ticks(6).map((t) => ({ t, x: xScale(t) })), [xScale]);
    const yTicks = useMemo(() => yScale.ticks(6).map((t) => ({ t, y: yScale(t) })), [yScale]);

    function showTooltipAt(e: React.MouseEvent<SVGCircleElement>, text: string) {
        setTooltip({ x: e.clientX + 12, y: e.clientY + 12, text });
    }
    function hideTooltip() {
        setTooltip(null);
    }

    // ---------------------------
    // Brushing (d3-brush)
    // ---------------------------
    useEffect(() => {
        if (!enableBrush) return;
        if (!brushGRef.current) return;

        const g = d3.select(brushGRef.current);

        // Clear any old brush content (important when re-initializing)
        g.selectAll("*").remove();

        // Decide brush extent based on placement.
        // "plot" => full plot area
        // "xBand" => thin horizontal band near x-axis
        // "yBand" => thin vertical band near y-axis
        let extent: [[number, number], [number, number]];
        if (brushPlacement === "xBand") {
            const y1 = height - marginBottom - brushBandSize;
            const y2 = height - marginBottom;
            extent = [
                [marginLeft, y1],
                [width - marginRight, y2],
            ];
        } else if (brushPlacement === "yBand") {
            const x1 = marginLeft;
            const x2 = marginLeft + brushBandSize;
            extent = [
                [x1, marginTop],
                [x2, height - marginBottom],
            ];
        } else {
            extent = [
                [marginLeft, marginTop],
                [width - marginRight, height - marginBottom],
            ];
        }

        // Create the correct brush generator.
        const brush =
            brushMode === "x" ? d3.brushX() : brushMode === "y" ? d3.brushY() : d3.brush();

        brush.extent(extent);

        // Optional label layer (inside brush <g>)
        const labelLayer = g.append("g").attr("class", "brush-value-labels").style("pointer-events", "none");

        const fmtX = formatBrushX ?? ((v: number) => `${v}`);
        const fmtY = formatBrushY ?? ((v: number) => `${v}`);

        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

        const snapValue = (v: number, step: number) => {
            if (!Number.isFinite(step) || step <= 0) return v;
            return Math.round(v / step) * step;
        };

        const same2 = (a: [number, number], b: [number, number]) =>
            Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;

        const same4 = (a: [[number, number], [number, number]], b: [[number, number], [number, number]]) =>
            Math.abs(a[0][0] - b[0][0]) < 0.5 &&
            Math.abs(a[0][1] - b[0][1]) < 0.5 &&
            Math.abs(a[1][0] - b[1][0]) < 0.5 &&
            Math.abs(a[1][1] - b[1][1]) < 0.5;

        /**
         * Convert pixel selection => domain selection, apply snapping (if enabled), and return snapped pixels too.
         */
        const snapSelection = (selection: any) => {
            if (selection == null) return { selectionPx: null as any, domain: { x: null, y: null } as BrushSelectionDomain };

            if (brushMode === "x") {
                const [px0, px1] = selection as [number, number];

                const d0 = xScale.invert(px0);
                const d1 = xScale.invert(px1);

                let lo = Math.min(d0, d1);
                let hi = Math.max(d0, d1);

                if (snapX && snapX > 0) {
                    lo = snapValue(lo, snapX);
                    hi = snapValue(hi, snapX);

                    // Avoid collapsing to zero-width due to rounding.
                    if (lo === hi) hi = lo + snapX;
                }

                // Clamp to x domain
                const dom = xScale.domain() as [number, number];
                lo = clamp(lo, Math.min(dom[0], dom[1]), Math.max(dom[0], dom[1]));
                hi = clamp(hi, Math.min(dom[0], dom[1]), Math.max(dom[0], dom[1]));

                const spx: [number, number] = [xScale(lo), xScale(hi)];
                return { selectionPx: spx, domain: { x: [lo, hi], y: null } as BrushSelectionDomain };
            }

            if (brushMode === "y") {
                const [py0, py1] = selection as [number, number];

                const d0 = yScale.invert(py0);
                const d1 = yScale.invert(py1);

                let lo = Math.min(d0, d1);
                let hi = Math.max(d0, d1);

                if (snapY && snapY > 0) {
                    lo = snapValue(lo, snapY);
                    hi = snapValue(hi, snapY);
                    if (lo === hi) hi = lo + snapY;
                }

                const dom = yScale.domain() as [number, number];
                lo = clamp(lo, Math.min(dom[0], dom[1]), Math.max(dom[0], dom[1]));
                hi = clamp(hi, Math.min(dom[0], dom[1]), Math.max(dom[0], dom[1]));

                const spx: [number, number] = [yScale(lo), yScale(hi)];
                return { selectionPx: spx, domain: { x: null, y: [lo, hi] } as BrushSelectionDomain };
            }

            // xy
            const [[px0, py0], [px1, py1]] = selection as [[number, number], [number, number]];

            let x0 = xScale.invert(px0);
            let x1 = xScale.invert(px1);
            let y0 = yScale.invert(py0);
            let y1 = yScale.invert(py1);

            let xLo = Math.min(x0, x1);
            let xHi = Math.max(x0, x1);
            let yLo = Math.min(y0, y1);
            let yHi = Math.max(y0, y1);

            if (snapX && snapX > 0) {
                xLo = snapValue(xLo, snapX);
                xHi = snapValue(xHi, snapX);
                if (xLo === xHi) xHi = xLo + snapX;
            }
            if (snapY && snapY > 0) {
                yLo = snapValue(yLo, snapY);
                yHi = snapValue(yHi, snapY);
                if (yLo === yHi) yHi = yLo + snapY;
            }

            const xDom = xScale.domain() as [number, number];
            xLo = clamp(xLo, Math.min(xDom[0], xDom[1]), Math.max(xDom[0], xDom[1]));
            xHi = clamp(xHi, Math.min(xDom[0], xDom[1]), Math.max(xDom[0], xDom[1]));

            const yDom = yScale.domain() as [number, number];
            yLo = clamp(yLo, Math.min(yDom[0], yDom[1]), Math.max(yDom[0], yDom[1]));
            yHi = clamp(yHi, Math.min(yDom[0], yDom[1]), Math.max(yDom[0], yDom[1]));

            const spx: [[number, number], [number, number]] = [
                [xScale(xLo), yScale(yHi)], // top-left in pixels (note y is inverted visually)
                [xScale(xHi), yScale(yLo)], // bottom-right
            ];

            return { selectionPx: spx, domain: { x: [xLo, xHi], y: [yLo, yHi] } as BrushSelectionDomain };
        };

        const renderBrushLabels = (domain: BrushSelectionDomain, selectionPx: any) => {
            labelLayer.selectAll("*").remove();
            if (!showBrushValues) return;
            if (selectionPx == null) return;

            const pad = 6;

            // A tiny helper that draws a dark pill label.
            const drawLabel = (x: number, y: number, text: string, anchor: "start" | "end" | "middle") => {
                const gLabel = labelLayer.append("g").attr("transform", `translate(${x},${y})`);
                const t = gLabel
                    .append("text")
                    .attr("fill", "white")
                    .attr("font-size", 11)
                    .attr("text-anchor", anchor)
                    .attr("dy", "0.32em")
                    .text(text);

                // bbox needs a DOM layout pass; SVG text bbox works fine here.
                const node = t.node();
                if (!node) return;
                const bb = (node as SVGTextElement).getBBox();

                const rx = anchor === "start" ? 0 : anchor === "end" ? -bb.width : -bb.width / 2;

                gLabel
                    .insert("rect", "text")
                    .attr("x", rx - pad)
                    .attr("y", -bb.height / 2 - pad / 2)
                    .attr("width", bb.width + pad * 2)
                    .attr("height", bb.height + pad)
                    .attr("rx", 6)
                    .attr("fill", "rgba(0,0,0,0.75)");
            };

            if (brushMode === "x" && domain.x) {
                const [lo, hi] = domain.x;
                const [px0, px1] = selectionPx as [number, number];

                // Put labels near top of plot (inside extent).
                const y = extent[0][1] + 14;
                drawLabel(px0, y, fmtX(lo), "start");
                drawLabel(px1, y, fmtX(hi), "end");
            } else if (brushMode === "y" && domain.y) {
                const [lo, hi] = domain.y;
                const [py0, py1] = selectionPx as [number, number];

                // Put labels near left edge of plot.
                const x = extent[0][0] + 8;
                drawLabel(x, py0, fmtY(lo), "start");
                drawLabel(x, py1, fmtY(hi), "start");
            } else if (brushMode === "xy" && domain.x && domain.y) {
                const [xLo, xHi] = domain.x;
                const [yLo, yHi] = domain.y;

                const [[x0, y0], [x1, y1]] = selectionPx as [[number, number], [number, number]];

                // x labels near bottom edge of selection
                drawLabel(x0, y1 - 12, fmtX(xLo), "start");
                drawLabel(x1, y1 - 12, fmtX(xHi), "end");

                // y labels near left edge of selection (top/bottom)
                drawLabel(x0 + 8, y0 + 12, fmtY(yHi), "start");
                drawLabel(x0 + 8, y1 - 12, fmtY(yLo), "start");
            }
        };

        const emitDomain = (domain: BrushSelectionDomain) => {
            onBrushChangeRef.current?.(domain);
        };

        // Guard to prevent infinite recursion when we call brush.move(...) inside brush handlers
        let moving = false;

        const handleEvent = (event: any, phase: "start" | "brush" | "end") => {
            if (moving) return;

            const rawSel = event.selection;

            // Cleared
            if (rawSel == null) {
                emitDomain({ x: null, y: null });
                renderBrushLabels({ x: null, y: null }, null);
                return;
            }

            const { selectionPx, domain } = snapSelection(rawSel);

            // If snapping is enabled, keep the brush UI aligned with snapped values while dragging.
            // This makes the range stable and ensures downstream views update consistently.
            if (selectionPx != null) {
                const needsMove =
                    (brushMode === "x" && Array.isArray(rawSel) && same2(rawSel as any, selectionPx as any) === false) ||
                    (brushMode === "y" && Array.isArray(rawSel) && same2(rawSel as any, selectionPx as any) === false) ||
                    (brushMode === "xy" && same4(rawSel as any, selectionPx as any) === false);

                if (needsMove) {
                    moving = true;
                    g.call((brush as any).move, selectionPx);
                    moving = false;
                    // After moving, D3 will fire another brush event; we can return here to avoid double-emit.
                    return;
                }
            }

            // Emit domain every time "brush" fires (fixes “drag block doesn’t update”).
            emitDomain(domain);
            renderBrushLabels(domain, selectionPx);

            // (Optional) You can log phases if debugging
            // console.log(`[LinePlot] ${phase}`, { rawSel, domain });
        };

        brush.on("start", (event: any) => handleEvent(event, "start"));
        brush.on("brush", (event: any) => handleEvent(event, "brush"));
        brush.on("end", (event: any) => handleEvent(event, "end"));

        // Render brush
        g.call(brush as any);

        // Nice UX: double-click to clear brush
        g.on("dblclick", () => {
            g.call((brush as any).move, null);
            emitDomain({ x: null, y: null });
            labelLayer.selectAll("*").remove();
        });

        return () => {
            brush.on("start", null);
            brush.on("brush", null);
            brush.on("end", null);
            g.on("dblclick", null);
        };
    }, [
        enableBrush,
        brushMode,
        brushPlacement,
        brushBandSize,
        snapX,
        snapY,
        showBrushValues,
        formatBrushX,
        formatBrushY,
        xScale,
        yScale,
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
                <defs>
                    <clipPath id={clipId}>
                        <rect x={marginLeft} y={marginTop} width={innerWidth} height={innerHeight} />
                    </clipPath>
                </defs>

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
                        {yTicks.map(({ t, y }) => (
                            <line
                                key={`gy-${t}`}
                                x1={marginLeft}
                                x2={width - marginRight}
                                y1={y}
                                y2={y}
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

                        {/* Y axis */}
                        <line
                            x1={marginLeft}
                            x2={marginLeft}
                            y1={marginTop}
                            y2={height - marginBottom}
                            stroke="currentColor"
                        />
                        {yTicks.map(({ t, y }) => (
                            <g key={`yt-${t}`} transform={`translate(${marginLeft},${y})`}>
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
                    <path fill="none" stroke={stroke} strokeWidth={strokeWidth} d={pathD} />

                    {showPoints && (
                        <g fill={pointFill} stroke={pointStroke} strokeWidth={1.5}>
                            {points.map((p) => {
                                const hoverable = Boolean(pointTitle);
                                const text = pointTitle ? pointTitle(p.raw, p.i) : "";
                                return (
                                    <circle
                                        key={p.i}
                                        cx={p.x}
                                        cy={p.y}
                                        r={pointRadius}
                                        style={{ cursor: hoverable ? "help" : "default" }}
                                        onMouseMove={hoverable ? (e) => showTooltipAt(e, text) : undefined}
                                        onMouseLeave={hoverable ? hideTooltip : undefined}
                                    />
                                );
                            })}
                        </g>
                    )}
                </g>

                {/* Brush overlay (OPTIONAL) */}
                {enableBrush && <g ref={brushGRef} />}
            </svg>

            {/* Point tooltip */}
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
                        maxWidth: 320,
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </>
    );
}