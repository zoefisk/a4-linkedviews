"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";
import LinePlot from "@/components/LinePlot";
import { coerceMovieRow, computeYearSummaries } from "@/lib/movies";
import type { MovieRow, YearSummary } from "@/lib/movies";

export default function MoviesAvgRatingLine() {
    const [rows, setRows] = useState<MovieRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        d3.csv("/movies_by_year.csv")
            .then((raw) => {
                if (cancelled) return;

                // d3 returns an array of objects like Record<string,string>
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
        return computeYearSummaries(rows, 3); // minCount = 3 (tweak as you like)
    }, [rows]);

    if (error) return <p style={{ color: "crimson" }}>Failed to load CSV: {error}</p>;
    if (!rows) return <p>Loading movies…</p>;
    if (points.length === 0) return <p>No usable year/rating data found.</p>;

    const yearMin = points[0].year;
    const yearMax = points[points.length - 1].year;

    return (
        <section>
            <h2>Average IMDb Rating by Year</h2>

            <LinePlot<YearSummary>
                data={points}
                x={(d) => d.year}
                y={(d) => d.avgRating}
                pointTitle={(d) =>
                    `${d.year}
                Avg rating: ${d.avgRating.toFixed(2)} (n=${d.count})
                Top movie: ${d.bestTitle} (${d.bestRating.toFixed(1)})`
                }
            />
        </section>
    );
}