// app/page.tsx
import MoviesDashboard from "@/components/graphs/MoviesDashboard";

export default function Page() {
    return (
        <div style={{ background: "#fafafa", minHeight: "100vh" }}>
            <MoviesDashboard />
        </div>
    );
}