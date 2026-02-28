// src/components/graphs/MoviesAvgRatingLine.tsx
"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useState } from "react";
import LinePlot, { BrushSelection } from "@/components/LinePlot";
import { coerceMovieRow, computeYearSummaries } from "@/lib/movies";
import type { MovieRow, YearSummary } from "@/lib/movies";

export default function MoviesAvgRatingLine(props: {
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
        return computeYearSummaries(rows, 3);
    }, [rows]);

    const handleBrushChange = useCallback(
        (sel: BrushSelection) => {
            if (!props.onYearBrush) return;

            if (!sel.x) {
                props.onYearBrush(null);
                return;
            }

            // LinePlot snaps, but we still guard ordering + integer years here.
            const lo = Math.floor(Math.min(sel.x[0], sel.x[1]));
            const hi = Math.ceil(Math.max(sel.x[0], sel.x[1]));
            props.onYearBrush([lo, hi]);
        },
        [props.onYearBrush]
    );

    if (error) return <p style={{ color: "crimson" }}>Failed to load CSV: {error}</p>;
    if (!rows) return <p>Loading movies…</p>;
    if (points.length === 0) return <p>No usable year/rating data found.</p>;

    return (
        <section>
            <h2>Average IMDb Rating by Year</h2>

            <LinePlot<YearSummary>
                data={points}
                width={900}
                height={420}
                showGrid
                showAxes
                x={(d) => d.year}
                y={(d) => d.avgRating}
                pointTitle={(d) =>
                    `${d.year}\nAvg rating: ${d.avgRating.toFixed(2)} (n=${d.count})\nTop movie: ${d.bestTitle} (${d.bestRating.toFixed(1)})`
                }
                enableBrush
                brushMode="x"
                enableSnap
                xStep={1}
                onBrushChange={handleBrushChange}
            />
        </section>
    );
}