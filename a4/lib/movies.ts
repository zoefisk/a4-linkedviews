// src/lib/movies.ts

/**
 * ===============================
 * Movie Data Types & Utilities
 * ===============================
 *
 * This module contains:
 *  - Raw CSV row types
 *  - Normalized data models
 *  - Aggregation helpers for linked visualizations
 *
 * It intentionally contains NO React or D3 code.
 * This keeps data logic reusable and testable.
 */

/* ============================== */
/* ========= RAW TYPES ========== */
/* ============================== */

/**
 * Represents a single row as loaded directly from the CSV file.
 * All values are strings because d3.csv parses everything as text.
 */
export type MovieRow = {
    title: string;
    year: string;
    rating: string;
    votes: string;
};

/**
 * Aggregated statistics for a single release year.
 * Used by the line chart.
 */
export type YearSummary = {
    year: number;
    avgRating: number;
    count: number;
    bestTitle: string;
    bestRating: number;
};

/**
 * Normalized movie record used by the bar chart.
 */
export type TopMovie = {
    title: string;
    year: number;
    rating: number;
    votes: number | null;
};

/* ============================== */
/* ======= PARSE HELPERS ======== */
/* ============================== */

/**
 * Safely converts an unknown value to a number.
 * Returns null if conversion fails or results in NaN.
 */
export function toNumber(v: unknown): number | null {
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

/**
 * Converts a raw CSV row into a typed MovieRow.
 * Missing fields are replaced with empty strings.
 */
export function coerceMovieRow(row: Record<string, string>): MovieRow {
    return {
        title: row.title ?? "",
        year: row.year ?? "",
        rating: row.rating ?? "",
        votes: row.votes ?? "",
    };
}

/**
 * Converts a MovieRow into numeric values usable for analysis.
 * Invalid rows (missing year/rating or invalid rating range) return null.
 */
export function normalizeMovieRow(
    row: MovieRow
): { year: number; rating: number } | null {
    const year = toNumber(row.year);
    const rating = toNumber(row.rating);

    if (year == null || rating == null) return null;
    if (rating <= 0 || rating > 10) return null;

    return { year, rating };
}

/* ============================== */
/* ===== YEAR AGGREGATION ======= */
/* ============================== */

/**
 * Computes per-year aggregates for the line chart.
 *
 * @param rows - Raw movie rows
 * @param minCount - Minimum number of movies required to include a year
 * @returns Sorted array of yearly summaries
 */
export function computeYearSummaries(
    rows: MovieRow[],
    minCount = 1
): YearSummary[] {
    const acc = new Map<
        number,
        {
            sum: number;
            count: number;
            bestTitle: string;
            bestRating: number;
        }
    >();

    for (const r of rows) {
        const norm = normalizeMovieRow(r);
        if (!norm) continue;

        const cur = acc.get(norm.year) ?? {
            sum: 0,
            count: 0,
            bestTitle: "",
            bestRating: -Infinity,
        };

        cur.sum += norm.rating;
        cur.count += 1;

        // Track the highest-rated movie for tooltip context
        if (norm.rating > cur.bestRating) {
            cur.bestRating = norm.rating;
            cur.bestTitle = r.title || "(unknown title)";
        }

        acc.set(norm.year, cur);
    }

    return Array.from(acc.entries())
        .map(([year, v]) => ({
            year,
            avgRating: v.sum / v.count,
            count: v.count,
            bestTitle: v.bestTitle,
            bestRating: v.bestRating,
        }))
        .filter((d) => d.count >= minCount)
        .sort((a, b) => a.year - b.year);
}

/* ============================== */
/* ===== TOP-RATED MOVIES ======= */
/* ============================== */

/**
 * Computes the top-rated movies within an optional year range.
 *
 * Used by the bar chart and linked to the line chart brush.
 *
 * @param rows - Raw movie rows
 * @param opts.yearRange - Inclusive year range filter
 * @param opts.limit - Maximum number of movies to return
 * @param opts.minVotes - Optional minimum vote threshold
 */
export function computeTopRatedMovies(
    rows: MovieRow[],
    opts?: {
        yearRange?: [number, number] | null;
        limit?: number;
        minVotes?: number;
    }
): TopMovie[] {
    const yearRange = opts?.yearRange ?? null;
    const limit = opts?.limit ?? 10;
    const minVotes = opts?.minVotes ?? 0;

    // Normalize and filter invalid rows
    const normalized: TopMovie[] = rows
        .map((r) => {
            const year = toNumber(r.year);
            const rating = toNumber(r.rating);
            const votes = toNumber(r.votes);

            if (year == null || rating == null) return null;
            if (rating <= 0 || rating > 10) return null;

            return { title: r.title, year, rating, votes };
        })
        .filter(Boolean) as TopMovie[];

    // Apply filters
    const filtered = normalized.filter((m) => {
        if (yearRange) {
            const [a, b] = yearRange;
            if (m.year < a || m.year > b) return false;
        }
        if (minVotes && (m.votes ?? 0) < minVotes) return false;
        return true;
    });

    // Sort by rating, then votes
    filtered.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.votes ?? 0) - (a.votes ?? 0);
    });

    return filtered.slice(0, limit);
}