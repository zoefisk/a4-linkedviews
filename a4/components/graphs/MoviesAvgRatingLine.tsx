// src/components/graphs/MoviesAvgRatingLine.tsx

"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useState } from "react";
import LinePlot, { BrushSelection } from "@/components/LinePlot";
import { coerceMovieRow, computeYearSummaries } from "@/lib/movies";
import type { MovieRow, YearSummary } from "@/lib/movies";

/**
 * Props for MoviesAvgRatingLine.
 */
export interface MoviesAvgRatingLineProps {
    /**
     * Callback fired whenever the user brushes a year range on the x-axis.
     * The range is inclusive and expressed in years.
     *
     * `null` indicates that the brush was cleared.
     */
    onYearBrush?: (range: [number, number] | null) => void;

    /**
     * Year to visually highlight on the line chart.
     * Used for linked highlighting when hovering bars in the bar chart.
     */
    highlightYear?: number | null;
}

/**
 * MoviesAvgRatingLine
 *
 * Displays a line chart of **average IMDb rating per year**.
 * This chart serves as the *primary interaction view*:
 *
 * - Supports brushing to select a year range
 * - Drives filtering in the linked bar chart
 * - Highlights a single year when a bar is hovered
 */
export default function MoviesAvgRatingLine({
                                                onYearBrush,
                                                highlightYear,
                                            }: MoviesAvgRatingLineProps) {
    /**
     * Raw movie rows loaded from the CSV.
     * Stored once and reused for derived computations.
     */
    const [rows, setRows] = useState<MovieRow[] | null>(null);

    /**
     * Load the CSV on mount.
     *
     * We manually compute the basePath so this works both:
     * - locally ("/movies_by_year.csv")
     * - on GitHub Pages ("/a4-linkedviews/movies_by_year.csv")
     */
    useEffect(() => {
        const basePath =
            process.env.NODE_ENV === "production" ? "/a4-linkedviews" : "";

        d3.csv(`${basePath}/movies_by_year.csv`).then((raw) => {
            setRows(raw.map((r) => coerceMovieRow(r as Record<string, string>)));
        });
    }, []);

    /**
     * Aggregate raw rows into per-year summaries.
     *
     * Each YearSummary contains:
     * - year
     * - average rating
     * - movie count
     * - top-rated movie for that year
     */
    const points: YearSummary[] = useMemo(
        () => (rows ? computeYearSummaries(rows, 3) : []),
        [rows]
    );

    /**
     * Extract the list of years for brush snapping.
     * This ensures the brush locks cleanly to integer years.
     */
    const years = useMemo(() => points.map((p) => p.year), [points]);

    /**
     * Handle brush updates coming from the LinePlot.
     *
     * Converts the raw brush selection into an ordered [min, max] year range
     * and forwards it to the dashboard for linked filtering.
     */
    const handleBrushChange = useCallback(
        (sel: BrushSelection) => {
            if (!onYearBrush || !sel.x) {
                onYearBrush?.(null);
                return;
            }

            onYearBrush([
                Math.min(sel.x[0], sel.x[1]),
                Math.max(sel.x[0], sel.x[1]),
            ]);
        },
        [onYearBrush]
    );

    /** Loading state while CSV is being fetched */
    if (!rows) return <p>Loading…</p>;

    return (
        <LinePlot<YearSummary>
            data={points}
            title="Average IMDb Rating by Year"
            xLabel="Release year"
            yLabel="Average IMDb rating"
            x={(d) => d.year}
            y={(d) => d.avgRating}

            /** Keep point size constant for visual stability */
            pointRadius={3}

            /**
             * Highlight a specific year without affecting point sizing.
             * This is driven by hover events in the linked bar chart.
             */
            highlightX={highlightYear ?? null}

            /**
             * Tooltip shown when hovering over a year point.
             * Uses multi-line formatting for readability.
             */
            pointTitle={(d) =>
                `${d.year}
Average rating: ${d.avgRating.toFixed(2)}
Movies that year: ${d.count}
Top movie: ${d.bestTitle} (rated ${d.bestRating.toFixed(1)})`
            }

            /** Enable interactive brushing */
            enableBrush

            /** Snap brush edges to exact years */
            enableSnap
            snapXValues={years}

            /** Notify parent dashboard of brush changes */
            onBrushChange={handleBrushChange}
        />
    );
}