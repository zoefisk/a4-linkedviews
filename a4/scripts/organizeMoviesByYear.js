// scripts/organizeMoviesByYear.js

/**
 * Script: organizeMoviesByYear
 * ----------------------------------------
 * This script preprocesses the raw IMDb dataset into a clean, normalized CSV
 * that is optimized for client-side visualization with D3.
 *
 * WHY THIS EXISTS:
 * - The original dataset is tab-separated (TSV), messy, and inconsistent
 * - Next.js (static export) cannot rely on runtime data cleaning
 * - Preprocessing once keeps visualization code simpler, faster, and safer
 *
 * INPUT:
 *   public/IMBD.csv
 *   - Tab-separated values (TSV)
 *   - Contains IMDb movie ratings and vote counts
 *
 * OUTPUT:
 *   public/movies_by_year.csv
 *   - Standard comma-separated CSV
 *   - Clean numeric fields
 *   - One row per movie
 *
 * This file is meant to be run manually via:
 *   node scripts/organizeMoviesByYear.js
 */

import fs from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

/** Path to the raw IMDb dataset (TSV format) */
const inputPath = "public/IMBD.csv";

/** Path to the cleaned output CSV used by the visualizations */
const outputPath = "public/movies_by_year.csv";

/* -------------------------------------------------------------------------- */
/*                              READ INPUT FILE                               */
/* -------------------------------------------------------------------------- */

/**
 * Read the raw dataset into memory.
 * This is safe because the dataset is reasonably small and processed once.
 */
const csvText = fs.readFileSync(inputPath, "utf-8");

/**
 * Parse the TSV file.
 *
 * IMPORTANT:
 * - This dataset is TAB-separated, not comma-separated
 * - columns: true → returns objects keyed by column name
 */
const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: "\t",
});

/* -------------------------------------------------------------------------- */
/*                          CLEAN + NORMALIZE DATA                             */
/* -------------------------------------------------------------------------- */

/**
 * Normalize each record into a strict shape:
 *   {
 *     title: string,
 *     year: number,
 *     rating: number,
 *     votes: number | ""
 *   }
 *
 * Invalid or unusable rows are filtered out.
 */
const cleaned = records
    .map((r) => {
        const year = Number(r.Year);
        const rating = Number(r["Weighted Mean"]);
        const votes = Number(
            String(r["Total ratings"] ?? "").replace(/,/g, "")
        );

        // Reject rows with invalid years
        if (!Number.isFinite(year)) return null;

        // Reject rows with invalid ratings
        if (!Number.isFinite(rating) || rating <= 0 || rating > 10) return null;

        return {
            title: r.Title ?? "(unknown title)",
            year,
            rating,
            votes: Number.isFinite(votes) ? votes : "",
        };
    })
    .filter(Boolean);

/* -------------------------------------------------------------------------- */
/*                                SORT OUTPUT                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sort movies chronologically.
 * This makes downstream grouping and visualization predictable.
 */
cleaned.sort((a, b) => a.year - b.year);

/* -------------------------------------------------------------------------- */
/*                              WRITE OUTPUT CSV                               */
/* -------------------------------------------------------------------------- */

/**
 * Convert cleaned data back into CSV format with headers.
 * This output is directly consumed by d3.csv() in the browser.
 */
const out = stringify(cleaned, {
    header: true,
});

/** Write the final dataset to disk */
fs.writeFileSync(outputPath, out);

/* -------------------------------------------------------------------------- */
/*                                   DONE                                     */
/* -------------------------------------------------------------------------- */

console.log(`Wrote ${cleaned.length} rows to ${outputPath}`);