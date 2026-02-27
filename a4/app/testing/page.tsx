import MoviesAvgRatingLine from "@/components/graphs/MoviesAvgRatingLine";

export default function Page() {
    return (
        <main style={{ padding: 24 }}>
            <h1>Average Movie Ratings Over Time</h1>

            <MoviesAvgRatingLine />
        </main>
    );
}