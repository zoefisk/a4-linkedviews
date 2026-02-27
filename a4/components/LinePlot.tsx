// src/components/LinePlot.tsx
import * as d3 from "d3";
import React, { useId, useMemo } from "react";

type Accessor<T> = (d: T, i: number) => number;

export interface LinePlotProps<T> {
    data: T[];

    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;

    // Accessors (defaults support number[])
    x?: Accessor<T>;
    y?: Accessor<T>;

    // Domain overrides
    xDomain?: [number, number];
    yDomain?: [number, number];

    // Toggles
    showPoints?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;

    // Styling
    stroke?: string;
    strokeWidth?: number;
    pointRadius?: number;
    pointFill?: string;
    pointStroke?: string;

    // Tooltip text for points
    pointTitle?: (d: T, i: number) => string;

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

                                        pointTitle,

                                        className,
                                    }: LinePlotProps<T>) {
    const clipId = useId();

    // Tooltip state (reliable hover tooltip instead of SVG <title>)
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

        const xd =
            xDomain ?? ((d3.extent(xs) as [number, number] | null) ?? [0, 1]);
        const yd =
            yDomain ?? ((d3.extent(ys) as [number, number] | null) ?? [0, 1]);

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

    const xTicks = useMemo(
        () => xScale.ticks(6).map((t) => ({ t, x: xScale(t) })),
        [xScale]
    );
    const yTicks = useMemo(
        () => yScale.ticks(6).map((t) => ({ t, y: yScale(t) })),
        [yScale]
    );

    function showTooltip(e: React.MouseEvent<SVGCircleElement>, text: string) {
        // viewport coords => no SVG offset math needed
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

                <g clipPath={`url(#${clipId})`}>
                    <path
                        fill="none"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        d={pathD}
                    />

                    {showPoints && (
                        <g fill={pointFill} stroke={pointStroke} strokeWidth={1.5}>
                            {points.map((p) => {
                                const text = pointTitle ? pointTitle(p.raw, p.i) : "";
                                const hoverable = Boolean(pointTitle);

                                return (
                                    <circle
                                        key={p.i}
                                        cx={p.x}
                                        cy={p.y}
                                        r={pointRadius}
                                        style={{ cursor: hoverable ? "help" : "default" }}
                                        onMouseMove={
                                            hoverable ? (e) => showTooltip(e, text) : undefined
                                        }
                                        onMouseLeave={hoverable ? hideTooltip : undefined}
                                    />
                                );
                            })}
                        </g>
                    )}
                </g>
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
                        maxWidth: 320,
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </>
    );
}