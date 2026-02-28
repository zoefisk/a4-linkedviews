// src/components/graphs/MoviesAvgRatingLine.tsx
"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useState } from "react";
import LinePlot from "@/components/LinePlot";
import { coerceMovieRow, computeYearSummaries } from "@/lib/movies";
import type { MovieRow, YearSummary } from "@/lib/movies";

/**
 * Line chart of average IMDb rating by year.
 *
 * Emits brushed year ranges back to the parent dashboard (linked view).
 */
export default function MoviesAvgRatingLine(props: {
    /**
     * Receives the brushed x-range (as floats) or null if cleared.
     * The dashboard may round to integer years for filtering.
     */
    onYearBrush?: (range: [number, number] | null) => void;
}) {
    const [rows, setRows] = useState<MovieRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    const points: YearSummary[] = useMemo(() => {
        if (!rows) return [];
        return computeYearSummaries(rows, 3); // minCount=3 helps avoid nonsense years
    }, [rows]);

    const handleBrushChange = useCallback(
        (sel: { x: [number, number] | null; y: [number, number] | null }) => {
            if (!props.onYearBrush) return;

            if (!sel.x) {
                props.onYearBrush(null);
                return;
            }

            const [a, b] = sel.x;
            const lo = Math.min(a, b);
            const hi = Math.max(a, b);
            props.onYearBrush([lo, hi]);
        },
        [props.onYearBrush]
    );

    if (error) return <p style={{ color: "crimson" }}>Failed to load CSV: {error}</p>;
    if (!rows) return <p>Loading movies…</p>;
    if (points.length === 0) return <p>No usable year/rating data found.</p>;

    return (
        <section>
            <h2 style={{ marginTop: 0 }}>Average IMDb Rating by Year</h2>

            <LinePlot<YearSummary>
                data={points}
                width={900}
                height={420}
                showGrid
                x={(d) => d.year}
                y={(d) => d.avgRating}
                pointTitle={(d) =>
                    `${d.year}
Avg rating: ${d.avgRating.toFixed(2)} (n=${d.count})
Top movie: ${d.bestTitle} (${d.bestRating.toFixed(1)})`
                }
                enableBrush
                brushMode="x"
                brushPlacement="plot"      // ✅ full plot height for X brushing
                snapX={1}                  // ✅ snap to whole years
                showBrushValues            // ✅ show endpoints on the brush itself
                formatBrushX={(v) => `${Math.round(v)}`}
                onBrushChange={handleBrushChange}
            />
        </section>
    );
}