// src/components/LinePlot.tsx
import * as d3 from "d3";
import React, { useId, useMemo } from "react";

/**
 * Accessor function used to read numeric values from your data.
 * - `d` = datum
 * - `i` = index
 */
type Accessor<T> = (d: T, i: number) => number;

/**
 * Props for the LinePlot component.
 *
 * This component is intentionally "React-first":
 * - We use D3 for math (scales, line generator, extents).
 * - We render the SVG elements with React (no `d3.select(...).append(...)`).
 *
 * Tips:
 * - For `number[]` data: you can omit `x` and `y` (defaults will work).
 * - For object data: pass `x={(d)=>...}` and `y={(d)=>...}`.
 * - For tooltips: pass `pointTitle` to enable hover text.
 */
export interface LinePlotProps<T> {

    /** Data array to visualize. */
    data: T[];

    /** Width of the SVG in pixels. Default: 640 */
    width?: number;
    /** Height of the SVG in pixels. Default: 400 */
    height?: number;

    /** Chart margins in pixels. */
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    /**
     * X accessor (data-space). Default: index of the item.
     * Example: `x={(d) => d.year}`
     */
    x?: Accessor<T>;

    /**
     * Y accessor (data-space). Default: assumes `T` is a number.
     * Example: `y={(d) => d.avgRating}`
     */
    y?: Accessor<T>;

    /**
     * Optional domain overrides for x and y.
     * Use this if you want consistent scales across multiple charts.
     */
    xDomain?: [number, number];
    yDomain?: [number, number];

    /** Show/hide point markers. Default: true */
    showPoints?: boolean;
    /** Show/hide axes. Default: true */
    showAxes?: boolean;
    /** Show/hide grid. Default: false */
    showGrid?: boolean;

    /** Line styling */
    stroke?: string;
    strokeWidth?: number;

    /** Point styling */
    pointRadius?: number;
    pointFill?: string;
    pointStroke?: string;

    /**
     * Tooltip text shown on hover for each point.
     * - If provided, hovering points will show a tooltip near the cursor.
     * - If omitted, no tooltip behavior is attached.
     *
     * Example:
     * `pointTitle={(d) => `${d.year}\nAvg: ${d.avg.toFixed(2)}` }`
     */
    pointTitle?: (d: T, i: number) => string;

    /** Optional className applied to the <svg> for styling. */
    className?: string;
}

/**
 * LinePlot renders a reusable SVG line chart with optional points, axes, grid, and hover tooltip.
 *
 * - Generic `T` supports object-based data via accessors.
 * - Pure React rendering (no D3 DOM mutation).
 * - Tooltip is implemented as a floating HTML element for reliable cross-browser behavior.
 */
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
                                    }: LinePlotProps<T>) {
    const clipId = useId();

    // Tooltip state for hover interactions (more reliable than SVG <title> tooltips).
    const [tooltip, setTooltip] = React.useState<{
        x: number; // viewport px
        y: number; // viewport px
        text: string;
    } | null>(null);

    // Default accessors:
    // - X defaults to index
    // - Y defaults to the datum itself (assumes `T` is number)
    const xAcc: Accessor<T> = x ?? ((_, i) => i);
    const yAcc: Accessor<T> = y ?? ((d: any) => d as number);

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    // Compute scales + path + projected point coordinates.
    // useMemo keeps this cheap and avoids recalculating unless inputs change.
    const { xScale, yScale, pathD, points } = useMemo(() => {
        const xs = data.map((d, i) => xAcc(d, i));
        const ys = data.map((d, i) => yAcc(d, i));

        const xd =
            xDomain ?? ((d3.extent(xs) as [number, number] | null) ?? [0, 1]);
        const yd =
            yDomain ?? ((d3.extent(ys) as [number, number] | null) ?? [0, 1]);

        // If domain is flat (min=max), expand it a bit to avoid NaN scale results.
        const fixDomain = (dom: [number, number]) =>
            dom[0] === dom[1] ? ([dom[0] - 1, dom[1] + 1] as [number, number]) : dom;

        const xScale = d3.scaleLinear(fixDomain(xd), [
            marginLeft,
            width - marginRight,
        ]);

        const yScale = d3.scaleLinear(fixDomain(yd), [
            height - marginBottom,
            marginTop,
        ]);

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

    // Tick values for axes/grid (SVG-only).
    const xTicks = useMemo(
        () => xScale.ticks(6).map((t) => ({ t, x: xScale(t) })),
        [xScale]
    );
    const yTicks = useMemo(
        () => yScale.ticks(6).map((t) => ({ t, y: yScale(t) })),
        [yScale]
    );

    function showTooltipAt(e: React.MouseEvent<SVGCircleElement>, text: string) {
        // Use viewport coordinates so we don't need to measure SVG offsets.
        setTooltip({
            x: e.clientX + 12,
            y: e.clientY + 12,
            text,
        });
    }

    function hideTooltip() {
        setTooltip(null);
    }

    return (
        <>
            <svg width={width} height={height} className={className}>
                <defs>
                    {/* Clip to prevent drawing into margins */}
                    <clipPath id={clipId}>
                        <rect
                            x={marginLeft}
                            y={marginTop}
                            width={innerWidth}
                            height={innerHeight}
                        />
                    </clipPath>
                </defs>

                {/* Grid (optional) */}
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

                {/* Axes (optional) */}
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
                        {xTicks.map(({ t, x }) => (
                            <g
                                key={`xt-${t}`}
                                transform={`translate(${x},${height - marginBottom})`}
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

                {/* Plot area */}
                <g clipPath={`url(#${clipId})`}>
                    {/* Line */}
                    <path
                        fill="none"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        d={pathD}
                    />

                    {/* Points (optional) */}
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
                                        onMouseMove={
                                            hoverable ? (e) => showTooltipAt(e, text) : undefined
                                        }
                                        onMouseLeave={hoverable ? hideTooltip : undefined}
                                    />
                                );
                            })}
                        </g>
                    )}
                </g>
            </svg>

            {/* Floating tooltip (optional, only shown when `pointTitle` is provided and a point is hovered) */}
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