"use client";

import { useMemo, useState } from "react";
import MoviesAvgRatingLine from "@/components/graphs/MoviesAvgRatingLine";
import MoviesTopRatedBar from "@/components/graphs/MoviesTopRatedBar";

type Range = [number, number];

function toYearRangeFloatSafe(r: Range): Range {
    const lo = Math.min(r[0], r[1]);
    const hi = Math.max(r[0], r[1]);
    return [Math.floor(lo), Math.ceil(hi)];
}

export default function MoviesDashboard() {
    const [brushedX, setBrushedX] = useState<Range | null>(null);
    const [hoverYear, setHoverYear] = useState<number | null>(null);

    const yearRange = useMemo(() => {
        if (!brushedX) return null;
        return toYearRangeFloatSafe(brushedX);
    }, [brushedX]);

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
                fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            }}
        >
            <header style={{display: "grid", gap: 6}}>
                <h1 style={{margin: 0, fontSize: 28, letterSpacing: -0.3}}>
                    Movie Ratings Explorer
                </h1>
                <p style={{marginBottom: 2, opacity: 0.7}}>
                    Quick note: The reason that the average ratings is so much higher in the early 1900s is that there are significantly less movies available from this data group, and all of the movies that were included were rated fairly high.
                </p>
                <p style={{margin: 0, opacity: 0.7}}>
                    Brush (drag your mouse on) a year range above the x-axis to filter the top-rated titles.
                    Hover a bar to highlight that year on the line chart.
                </p>
            </header>

            <section style={card}>
                <MoviesAvgRatingLine
                    onYearBrush={setBrushedX}
                    highlightYear={hoverYear}
                />
                <div style={{marginTop: 8, fontSize: 12, opacity: 0.7}}>
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

            <section style={card}>
                <MoviesTopRatedBar yearRange={yearRange} onHoverYear={setHoverYear} />
            </section>
        </main>
    );
}