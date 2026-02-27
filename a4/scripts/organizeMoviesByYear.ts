import fs from "fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

type Movie = {
    title: string;
    year: string;
    certificate: string;
    duration: string;
    genre: string;
    rating: string;
    votes: string;
};

// ---------- Helpers ----------

// Extract first 4-digit year from strings like "(2015–2022)" or "(2018– )"
function extractStartYear(yearStr: string): number | null {
    const match = yearStr.match(/\d{4}/);
    return match ? Number(match[0]) : null;
}

// ---------- Main Script ----------

const inputPath = "public/IMBD.csv";
const outputPath = "public/movies_by_year.csv";

// Read CSV
const csvText = fs.readFileSync(inputPath, "utf-8");

// Parse CSV into objects
const records: Movie[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
});

// Clean + normalize year
const cleaned = records
    .map((movie) => {
        const year = extractStartYear(movie.year);
        if (!year) return null;

        return {
            ...movie,
            year,
        };
    })
    .filter(Boolean) as (Omit<Movie, "year"> & { year: number })[];

// Sort by year (optional but nice)
cleaned.sort((a, b) => a.year - b.year);

// Write new CSV
const outputCsv = stringify(cleaned, {
    header: true,
});

fs.writeFileSync(outputPath, outputCsv);

console.log(`✅ Wrote ${cleaned.length} movies to ${outputPath}`);