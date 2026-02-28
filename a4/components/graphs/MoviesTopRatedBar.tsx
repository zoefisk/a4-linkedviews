// src/components/graphs/MoviesTopRatedBar.tsx
"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";
import HorizontalBarChart from "@/components/HorizontalBarChart";
import type { MovieRow, TopMovie } from "@/lib/movies";
import { coerceMovieRow, computeTopRatedMovies } from "@/lib/movies";

export default function MoviesTopRatedBar(props: {
    yearRange: [number, number] | null;
    onHoverYear?: (year: number | null) => void; // ✅ used to highlight a point in the line chart
}) {
    const [rows, setRows] = useState<MovieRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const basePath =
            process.env.NODE_ENV === "production" ? "/a4-linkedviews" : "";

        console.log("[BarChart] basePath =", basePath);
        console.log("[BarChart] CSV URL =", `${basePath}/movies_by_year.csv`);

        d3.csv(`${basePath}/movies_by_year.csv`)
            .then((raw) => {
                console.log("[BarChart] CSV loaded, rows =", raw.length);
                setRows(raw.map((r) => coerceMovieRow(r as Record<string, string>)));
            })
            .catch((e) => {
                console.error("[BarChart] CSV failed", e);
                setError(String(e));
            });
    }, []);

    const top: TopMovie[] = useMemo(() => {
        if (!rows) return [];
        if (!props.yearRange) return [];

        const [a, b] = props.yearRange;
        const lo = Math.floor(Math.min(a, b));
        const hi = Math.ceil(Math.max(a, b));

        return computeTopRatedMovies(rows, {
            yearRange: [lo, hi],
            limit: 10,
        });
    }, [rows, props.yearRange]);

    if (error) return <p style={{ color: "crimson" }}>Failed to load CSV: {error}</p>;
    if (!rows) return <p>Loading movies…</p>;

    if (!props.yearRange) {
        return (
            <section>
                <h2>Top Rated Movies</h2>
                <p style={{ opacity: 0.8 }}>
                    <b>Brush a year range</b> in the chart above to populate this view.
                    <br />
                    This chart updates <i>only</i> based on your selection.
                </p>
            </section>
        );
    }

    const [a, b] = props.yearRange;
    const lo = Math.floor(Math.min(a, b));
    const hi = Math.ceil(Math.max(a, b));

    if (top.length === 0) {
        return (
            <section>
                <h2>Top Rated Movies ({lo}–{hi})</h2>
                <p style={{ opacity: 0.8 }}>
                    No titles found in that brushed range.
                    <br />
                    Try widening your selection.
                </p>
            </section>
        );
    }

    return (
        <section>
            <h2>Top Rated Movies ({lo}–{hi})</h2>

            <p style={{ opacity: 0.7, marginTop: 4 }}>
                Hover a bar to highlight its year on the line chart.
            </p>

            <HorizontalBarChart<TopMovie>
                data={top}
                width={900}
                height={420}
                marginLeft={360}
                showAxes
                showGrid
                maxBars={10}
                sortDescending
                tightXDomain
                tightXPad={0.03}
                barFill="steelblue"
                xLabel="IMDb rating (zoomed)"
                yLabel="Movie"
                keyFn={(d) => `${d.title}__${d.year}__${d.rating}__${d.votes ?? 0}`}
                label={(d) => `${d.title} (${d.year})`}
                value={(d) => d.rating}
                barTitle={(d) =>
                    `${d.title} (${d.year})
Rating: ${d.rating.toFixed(1)}
Votes: ${typeof d.votes === "number" ? d.votes.toLocaleString() : "N/A"}`
                }
                onBarHover={(dOrNull) => {
                    props.onHoverYear?.(dOrNull ? dOrNull.year : null);
                }}
            />
        </section>
    );
}