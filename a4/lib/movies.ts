// src/lib/movies.ts

export type MovieRow = {
    title: string;
    year: string;
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

export function toNumber(v: unknown): number | null {
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

export function coerceMovieRow(row: Record<string, string>): MovieRow {
    return {
        title: row.title ?? "",
        year: row.year ?? "",
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
    if (rating <= 0 || rating > 10) return null;

    return { year, rating };
}

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

// ---------- Top Rated ----------

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
        minVotes?: number;
    }
): TopMovie[] {
    const yearRange = opts?.yearRange ?? null;
    const limit = opts?.limit ?? 10;
    const minVotes = opts?.minVotes ?? 0;

    const normalized = rows
        .map((r) => {
            const year = toNumber(r.year);
            const rating = toNumber(r.rating);
            const votes = toNumber(r.votes);

            if (year == null || rating == null) return null;
            if (rating <= 0 || rating > 10) return null;

            return { title: r.title, year, rating, votes };
        })
        .filter(Boolean) as TopMovie[];

    const filtered = normalized.filter((m) => {
        if (yearRange) {
            const [a, b] = yearRange;
            if (m.year < a || m.year > b) return false;
        }
        if (minVotes && (m.votes ?? 0) < minVotes) return false;
        return true;
    });

    filtered.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.votes ?? 0) - (a.votes ?? 0);
    });

    return filtered.slice(0, limit);
}