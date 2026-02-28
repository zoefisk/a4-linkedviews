// src/components/graphs/MoviesTopRatedBar.tsx
"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";
import HorizontalBarChart from "@/components/HorizontalBarChart";
import type { MovieRow, TopMovie } from "@/lib/movies";
import { coerceMovieRow, computeTopRatedMovies } from "@/lib/movies";

/**
 * Props for the MoviesTopRatedBar component.
 */
export interface MoviesTopRatedBarProps {
    /**
     * Brushed year range coming from the line chart.
     * If null, this view intentionally shows an instructional message.
     */
    yearRange: [number, number] | null;

    /**
     * Callback fired when a bar is hovered.
     * Used to highlight the corresponding year in the line chart.
     */
    onHoverYear?: (year: number | null) => void;
}

/**
 * MoviesTopRatedBar
 *
 * A linked view that displays the top-rated movies within a brushed
 * year range selected in the line chart.
 *
 * This component:
 *  - Loads the CSV dataset independently (static fetch via d3.csv)
 *  - Filters movies based on the brushed year range
 *  - Displays the top N movies as a horizontal bar chart
 *  - Emits hover events to support linked highlighting in the line chart
 *
 * This view is intentionally empty until a brush selection exists,
 * reinforcing the brushing-and-linking interaction model.
 */
export default function MoviesTopRatedBar({
                                              yearRange,
                                              onHoverYear,
                                          }: MoviesTopRatedBarProps) {
    /** Parsed movie rows from the CSV */
    const [rows, setRows] = useState<MovieRow[] | null>(null);

    /** Error message if CSV loading fails */
    const [error, setError] = useState<string | null>(null);

    /* ============================== DATA LOADING ============================== */

    useEffect(() => {
        /**
         * Base path handling for GitHub Pages.
         * In production, the app is served from /a4-linkedviews.
         */
        const basePath =
            process.env.NODE_ENV === "production" ? "/a4-linkedviews" : "";

        // Helpful debug logs during deployment troubleshooting
        console.log("[MoviesTopRatedBar] basePath =", basePath);
        console.log(
            "[MoviesTopRatedBar] CSV URL =",
            `${basePath}/movies_by_year.csv`
        );

        d3.csv(`${basePath}/movies_by_year.csv`)
            .then((raw) => {
                console.log(
                    "[MoviesTopRatedBar] CSV loaded, rows =",
                    raw.length
                );

                // Coerce string values into typed MovieRow objects
                const parsed = raw.map((r) =>
                    coerceMovieRow(r as Record<string, string>)
                );

                setRows(parsed);
            })
            .catch((e) => {
                console.error("[MoviesTopRatedBar] CSV failed to load", e);
                setError(e instanceof Error ? e.message : String(e));
            });
    }, []);

    /* ============================== DERIVED DATA ============================== */

    /**
     * Compute the top-rated movies within the brushed year range.
     * Memoized to avoid unnecessary recomputation.
     */
    const top: TopMovie[] = useMemo(() => {
        if (!rows) return [];
        if (!yearRange) return [];

        const [a, b] = yearRange;
        const lo = Math.floor(Math.min(a, b));
        const hi = Math.ceil(Math.max(a, b));

        return computeTopRatedMovies(rows, {
            yearRange: [lo, hi],
            limit: 10,
        });
    }, [rows, yearRange]);

    /* ============================== EARLY RETURNS ============================== */

    if (error) {
        return (
            <p style={{ color: "crimson" }}>
                Failed to load CSV: {error}
            </p>
        );
    }

    if (!rows) {
        return <p>Loading movies…</p>;
    }

    /**
     * No brush → show instructional text instead of bars.
     * This reinforces the linked-views interaction pattern.
     */
    if (!yearRange) {
        return (
            <section>
                <h2>Top Rated Movies</h2>
                <p style={{ opacity: 0.8 }}>
                    <b>Brush a year range</b> in the chart above to populate
                    this view.
                    <br />
                    This chart updates <i>only</i> based on your selection.
                </p>
            </section>
        );
    }

    const [a, b] = yearRange;
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

    /* ============================== RENDER ============================== */

    return (
        <section>
            <h2>
                Top Rated Movies ({lo}–{hi})
            </h2>

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

                /** Stable key ensures consistent rendering */
                keyFn={(d) =>
                    `${d.title}__${d.year}__${d.rating}__${d.votes ?? 0}`
                }

                /** Left-hand labels */
                label={(d) => `${d.title} (${d.year})`}

                /** Bar length value */
                value={(d) => d.rating}

                /** Tooltip content */
                barTitle={(d) =>
                    `${d.title} (${d.year})
Rating: ${d.rating.toFixed(1)}
Votes: ${
                        typeof d.votes === "number"
                            ? d.votes.toLocaleString()
                            : "N/A"
                    }`
                }

                /**
                 * Hover interaction → linked highlight in line chart
                 */
                onBarHover={(movieOrNull) => {
                    onHoverYear?.(
                        movieOrNull ? movieOrNull.year : null
                    );
                }}
            />
        </section>
    );
}