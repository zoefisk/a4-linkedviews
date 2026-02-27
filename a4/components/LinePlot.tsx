import * as d3 from "d3";
import React, { useId, useMemo } from "react";

type Accessor<T> = (d: T, i: number) => number;

export type BrushRange = { x0: number; x1: number } | null;

export interface LinePlotProps<T> {
    data: T[];

    // size
    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    // accessors (default assumes T is number)
    x?: Accessor<T>;
    y?: Accessor<T>;

    // domain overrides (optional)
    xDomain?: [number, number];
    yDomain?: [number, number];

    // rendering toggles
    showPoints?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;

    // styling
    stroke?: string;
    strokeWidth?: number;
    pointRadius?: number;
    pointFill?: string;
    pointStroke?: string;

    // brushing (optional)
    brushEnabled?: boolean;
    brushRange?: BrushRange; // controlled selection in pixel-space (we can switch to data-space later)
    onBrushRangeChange?: (range: BrushRange) => void;

    // className hook
    className?: string;
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

                                        brushEnabled = false,
                                        brushRange = null,
                                        onBrushRangeChange,

                                        className,
                                    }: LinePlotProps<T>) {
    const clipId = useId();

    // Default accessors so number[] still works with zero changes
    const xAcc: Accessor<T> = x ?? ((_, i) => i);
    const yAcc: Accessor<T> = y ?? ((d: any) => d as number);

    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    const { xScale, yScale, pathD, points } = useMemo(() => {
        const xs = data.map((d, i) => xAcc(d, i));
        const ys = data.map((d, i) => yAcc(d, i));

        const xd: [number, number] =
            xDomain ?? (d3.extent(xs) as [number, number] | null) ?? [0, 1];
        const yd: [number, number] =
            yDomain ?? (d3.extent(ys) as [number, number] | null) ?? [0, 1];

        // guard against identical domains (flat lines)
        const fixDomain = (dom: [number, number]) =>
            dom[0] === dom[1] ? ([dom[0] - 1, dom[1] + 1] as [number, number]) : dom;

        const xScale = d3
            .scaleLinear(fixDomain(xd), [marginLeft, width - marginRight]);

        const yScale = d3
            .scaleLinear(fixDomain(yd), [height - marginBottom, marginTop]);

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

    // Simple SVG-only brushing (no d3-brush yet).
    // This keeps your component “mostly the same” and React-driven.
    const [dragStartX, setDragStartX] = React.useState<number | null>(null);

    function clampX(px: number) {
        return Math.max(marginLeft, Math.min(width - marginRight, px));
    }

    function onPointerDown(e: React.PointerEvent<SVGRectElement>) {
        if (!brushEnabled) return;
        const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
        const px = clampX(e.clientX - rect.left);
        setDragStartX(px);
        onBrushRangeChange?.({ x0: px, x1: px });
    }

    function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
        if (!brushEnabled) return;
        if (dragStartX == null) return;
        const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
        const px = clampX(e.clientX - rect.left);
        const x0 = Math.min(dragStartX, px);
        const x1 = Math.max(dragStartX, px);
        onBrushRangeChange?.({ x0, x1 });
    }

    function onPointerUp() {
        if (!brushEnabled) return;
        setDragStartX(null);

        // tiny drags = clear selection
        if (brushRange && Math.abs(brushRange.x1 - brushRange.x0) < 3) {
            onBrushRangeChange?.(null);
        }
    }

    // Axes ticks (SVG-only, no DOM mutation)
    const xTicks = useMemo(() => xScale.ticks(6).map((t) => ({ t, x: xScale(t) })), [xScale]);
    const yTicks = useMemo(() => yScale.ticks(6).map((t) => ({ t, y: yScale(t) })), [yScale]);

    const brushRect =
        brushRange && brushEnabled
            ? {
                x: brushRange.x0,
                w: Math.max(0, brushRange.x1 - brushRange.x0),
            }
            : null;

    return (
        <svg width={width} height={height} className={className}>
            {/* clip so line/points don't draw into margins */}
            <defs>
                <clipPath id={clipId}>
                    <rect x={marginLeft} y={marginTop} width={innerWidth} height={innerHeight} />
                </clipPath>
            </defs>

            {/* optional grid */}
            {showGrid && (
                <g opacity={0.2}>
                    {xTicks.map(({ t, x }) => (
                        <line key={`gx-${t}`} x1={x} x2={x} y1={marginTop} y2={height - marginBottom} stroke="currentColor" />
                    ))}
                    {yTicks.map(({ t, y }) => (
                        <line key={`gy-${t}`} x1={marginLeft} x2={width - marginRight} y1={y} y2={y} stroke="currentColor" />
                    ))}
                </g>
            )}

            {/* axes */}
            {showAxes && (
                <g fontSize={10} fill="currentColor">
                    {/* x axis line */}
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

                    {/* y axis line */}
                    <line x1={marginLeft} x2={marginLeft} y1={marginTop} y2={height - marginBottom} stroke="currentColor" />
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

            {/* brush overlay (captures pointer events) */}
            <rect
                x={marginLeft}
                y={marginTop}
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: brushEnabled ? "crosshair" : "default" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            />

            {/* brush selection */}
            {brushRect && (
                <rect
                    x={brushRect.x}
                    y={marginTop}
                    width={brushRect.w}
                    height={innerHeight}
                    fill="currentColor"
                    opacity={0.15}
                />
            )}

            {/* line + points */}
            <g clipPath={`url(#${clipId})`}>
                <path fill="none" stroke={stroke} strokeWidth={strokeWidth} d={pathD} />

                {showPoints && (
                    <g fill={pointFill} stroke={pointStroke} strokeWidth={1.5}>
                        {points.map((p) => (
                            <circle key={p.i} cx={p.x} cy={p.y} r={pointRadius} />
                        ))}
                    </g>
                )}
            </g>
        </svg>
    );
}