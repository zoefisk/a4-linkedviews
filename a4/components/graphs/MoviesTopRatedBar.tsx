"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";
import HorizontalBarChart from "@/components/HorizontalBarChart";
import type { MovieRow, TopMovie } from "@/lib/movies";
import { coerceMovieRow, computeTopRatedMovies } from "@/lib/movies";

const DEBUG_BAR = true; // set false to silence logs

/**
 * Displays the top-rated movies within a brushed year range.
 *
 * STRICT: if no brush selection, intentionally shows no bars.
 */
export default function MoviesTopRatedBar(props: {
    /** Brushed year range from the line chart, or null if no brush */
    yearRange: [number, number] | null;
}) {
    const [rows, setRows] = useState<MovieRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load CSV once
    useEffect(() => {
        let cancelled = false;

        d3.csv("/movies_by_year.csv")
            .then((raw) => {
                if (cancelled) return;
                const parsed = raw.map((r) => coerceMovieRow(r as Record<string, string>));
                setRows(parsed);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : String(e));
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const top: TopMovie[] = useMemo(() => {
        if (DEBUG_BAR) console.log("[MoviesTopRatedBar] useMemo yearRange =", props.yearRange);

        if (!rows) return [];
        if (!props.yearRange) return [];

        const [a, b] = props.yearRange;
        const lo = Math.floor(Math.min(a, b));
        const hi = Math.ceil(Math.max(a, b));

        if (DEBUG_BAR) console.log("[MoviesTopRatedBar] computing top for ints =", [lo, hi]);

        return computeTopRatedMovies(rows, {
            yearRange: [lo, hi],
            limit: 10,
            // minVotes: 10000,
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
                <h2>
                    Top Rated Movies ({lo}–{hi})
                </h2>
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
            <h2>
                Top Rated Movies ({lo}–{hi})
            </h2>

            <p style={{ opacity: 0.7, marginTop: 4 }}>
                Showing the 10 highest-rated titles released within the selected year range.
            </p>

            <HorizontalBarChart<TopMovie>
                data={top}
                width={900}
                height={420}
                marginLeft={360}
                showAxes
                showGrid
                maxBars={10}
                sortDescending={true}
                xDomain={[0, 10]}
                barFill="steelblue"
                keyFn={(d) => `${d.title}__${d.year}__${d.rating}__${d.votes ?? 0}`}
                label={(d) => `${d.title} (${d.year})`}
                value={(d) => d.rating}
                barTitle={(d) =>
                    `${d.title} (${d.year})
Rating: ${d.rating.toFixed(1)}
Votes: ${d.votes ?? "N/A"}`
                }
            />
        </section>
    );
}