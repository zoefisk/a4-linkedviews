// src/components/graphs/MoviesDashboard.tsx

"use client";

import { useMemo, useState } from "react";
import MoviesAvgRatingLine from "@/components/graphs/MoviesAvgRatingLine";
import MoviesTopRatedBar from "@/components/graphs/MoviesTopRatedBar";

/**
 * A numeric year range represented as [minYear, maxYear].
 * Used for brushing and filtering across linked views.
 */
type Range = [number, number];

/**
 * Safely normalizes a brushed year range.
 *
 * - Ensures the lower bound comes first
 * - Floors / ceils values to avoid fractional years
 *
 * This is important because the brush may return
 * floating-point values from scale inversion.
 *
 * @param r range
 */
function toYearRangeFloatSafe(r: Range): Range {
    const lo = Math.min(r[0], r[1]);
    const hi = Math.max(r[0], r[1]);
    return [Math.floor(lo), Math.ceil(hi)];
}

/**
 * MoviesDashboard
 *
 * The main container for the linked-view visualization.
 *
 * Responsibilities:
 * - Owns shared interaction state (brush range + hover year)
 * - Coordinates communication between the line chart and bar chart
 * - Provides explanatory context and layout
 *
 * Linked interactions:
 * - Brushing the line chart updates the bar chart
 * - Hovering a bar highlights the corresponding year in the line chart
 */
export default function MoviesDashboard() {

    /**
     * The raw brushed range coming from the line chart.
     * Null means no active brush.
     */
    const [brushedX, setBrushedX] = useState<Range | null>(null);

    /**
     * The year currently being hovered in the bar chart.
     * Used to highlight a point in the line chart.
     */
    const [hoverYear, setHoverYear] = useState<number | null>(null);

    /**
     * A cleaned, integer-safe year range derived from the brush.
     * Memoized to avoid unnecessary recomputation.
     */
    const yearRange = useMemo(() => {
        if (!brushedX) return null;
        return toYearRangeFloatSafe(brushedX);
    }, [brushedX]);

    /**
     * Shared card-style container used for both visualizations.
     * Defined inline to keep the layout self-contained.
     */
    const card: React.CSSProperties = {
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 12,
        padding: 16,
        background: "white",
        boxShadow: "0 1px 10px rgba(0,0,0,0.04)",
    };

    return (
        <main
            style={{
                padding: 28,
                maxWidth: 1100,
                margin: "0 auto",
                display: "grid",
                gap: 16,
                fontFamily:
                    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            }}
        >

            {/* ===== Page Header & Context ===== */}
            <header style={{ display: "grid", gap: 6 }}>
                <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3 }}>
                    Movie Ratings Explorer
                </h1>

                <p style={{ marginBottom: 2, opacity: 0.7 }}>
                    Quick note: The reason that the average ratings are so much higher
                    in the early 1900s is that there are significantly fewer movies
                    available from this period, and most of those included were rated
                    fairly highly.
                </p>

                <p style={{ margin: 0, opacity: 0.7 }}>
                    Brush (drag your mouse on) a year range above the x-axis to filter
                    the top-rated titles. Hover a bar to highlight that year on the line
                    chart.
                </p>
            </header>

            {/* ===== Line Chart (Context + Brush Source) ===== */}
            <section style={card}>
                <MoviesAvgRatingLine
                    onYearBrush={setBrushedX}
                    highlightYear={hoverYear}
                />

                {/* Status / interaction feedback */}
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                    {yearRange ? (
                        <>
                            Selected years: <b>{yearRange[0]}</b>–<b>{yearRange[1]}</b>
                            {hoverYear != null ? (
                                <>
                                    {" "}
                                    | Hover year: <b>{hoverYear}</b>
                                </>
                            ) : null}
                        </>
                    ) : (
                        <>No selection yet.</>
                    )}
                </div>
            </section>

            {/* ===== Bar Chart (Detail View) ===== */}
            <section style={card}>
                <MoviesTopRatedBar
                    yearRange={yearRange}
                    onHoverYear={setHoverYear}
                />
            </section>
        </main>
    );
}