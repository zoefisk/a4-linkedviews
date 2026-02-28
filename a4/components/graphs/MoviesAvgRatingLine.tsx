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

    useEffect(() => {
        d3.csv("/movies_by_year.csv").then((raw) => {
            setRows(raw.map((r) => coerceMovieRow(r as Record<string, string>)));
        });
    }, []);

    const points = useMemo(
        () => (rows ? computeYearSummaries(rows, 3) : []),
        [rows]
    );

    const years = useMemo(() => points.map((p) => p.year), [points]);

    const handleBrushChange = useCallback(
        (sel: BrushSelection) => {
            if (!props.onYearBrush || !sel.x) {
                props.onYearBrush?.(null);
                return;
            }
            props.onYearBrush([
                Math.min(sel.x[0], sel.x[1]),
                Math.max(sel.x[0], sel.x[1]),
            ]);
        },
        [props.onYearBrush]
    );

    if (!rows) return <p>Loading…</p>;

    return (
        <LinePlot<YearSummary>
            data={points}
            title="Average IMDb Rating by Year"
            xLabel="Release year"
            yLabel="Average IMDb rating"
            x={(d) => d.year}
            y={(d) => d.avgRating}
            enableBrush
            enableSnap
            snapXValues={years}
            onBrushChange={handleBrushChange}
        />
    );
}