// src/lib/movies.ts

export type MovieRow = {
    title: string;
    year: string;
    certificate: string;
    duration: string;
    genre: string;
    rating: string;
    votes: string;
};

export type YearSummary = {
    year: number;
    avgRating: number;
    count: number;
    bestTitle: string;
    bestRating: number;
};

// ---------- helpers ----------

export function toNumber(v: unknown): number | null {
    if (v == null) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

/**
 * d3.csv() returns rows with string values.
 * This converts that loose Record<string,string> into our expected shape.
 * Missing columns become empty strings (safe defaults).
 */
export function coerceMovieRow(row: Record<string, string>): MovieRow {
    return {
        title: row.title ?? "",
        year: row.year ?? "",
        certificate: row.certificate ?? "",
        duration: row.duration ?? "",
        genre: row.genre ?? "",
        rating: row.rating ?? "",
        votes: row.votes ?? "",
    };
}

export function normalizeMovieRow(
    row: MovieRow
): { year: number; rating: number } | null {
    const year = toNumber(row.year);
    const rating = toNumber(row.rating);

    if (year == null || rating == null) return null;

    // Guard against impossible ratings causing cliffs/artifacts.
    // IMDb ratings should be (0, 10].
    if (rating <= 0 || rating > 10) return null;

    return { year, rating };
}

/**
 * Computes per-year summary stats:
 * - avg rating
 * - count
 * - highest rated title that year (bestTitle/bestRating)
 *
 * minCount can hide very sparse years (recommended: 3–10).
 */
export function computeYearSummaries(
    rows: MovieRow[],
    minCount = 1
): YearSummary[] {
    const acc = new Map<
        number,
        { sum: number; count: number; bestTitle: string; bestRating: number }
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

// Additions for Top Rated view

export type MovieNormalized = {
    title: string;
    year: number;
    rating: number;
    votes: number | null;
    genre: string;
};

export function toInt(v: unknown): number | null {
    if (v == null) return null;
    const s = String(v).trim().replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function normalizeMovieFull(row: MovieRow): MovieNormalized | null {
    const year = toNumber(row.year);
    const rating = toNumber(row.rating);
    if (year == null || rating == null) return null;

    // guard against impossible ratings
    if (rating <= 0 || rating > 10) return null;

    const votes = toInt(row.votes);
    return {
        title: row.title || "(unknown title)",
        year,
        rating,
        votes,
        genre: row.genre || "",
    };
}

export type TopMovie = {
    title: string;
    year: number;
    rating: number;
    votes: number | null;
};

export function computeTopRatedMovies(
    rows: MovieRow[],
    opts?: {
        yearRange?: [number, number] | null;
        limit?: number;
        minVotes?: number; // optional: helps avoid weird “1 vote = 10.0” cases
    }
): TopMovie[] {
    const yearRange = opts?.yearRange ?? null;
    const limit = opts?.limit ?? 10;
    const minVotes = opts?.minVotes ?? 0;

    const normalized = rows
        .map(normalizeMovieFull)
        .filter(Boolean) as MovieNormalized[];

    const filtered = normalized.filter((m) => {
        if (yearRange) {
            const [a, b] = yearRange;
            if (m.year < a || m.year > b) return false;
        }
        if (minVotes > 0) {
            const v = m.votes ?? 0;
            if (v < minVotes) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        // primary: rating desc
        if (b.rating !== a.rating) return b.rating - a.rating;
        // secondary: votes desc (if present)
        const bv = b.votes ?? -1;
        const av = a.votes ?? -1;
        return bv - av;
    });

    return filtered.slice(0, limit).map((m) => ({
        title: m.title,
        year: m.year,
        rating: m.rating,
        votes: m.votes,
    }));
}