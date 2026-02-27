// src/app/examples/lineplot/page.tsx
import LinePlot from "@/components/LinePlot";
import type { YearSummary } from "@/lib/movies";

export default function LinePlotExamplesPage() {
    const simple = [10, 30, 20, 50, 40, 60, 45];

    const objs = [
        { t: 0, v: 2 },
        { t: 1, v: 4 },
        { t: 2, v: 3 },
        { t: 3, v: 7 },
    ];

    const years: YearSummary[] = [
        { year: 2000, avgRating: 7.1, count: 12, bestTitle: "X", bestRating: 8.9 },
        { year: 2001, avgRating: 6.8, count: 9, bestTitle: "Y", bestRating: 8.5 },
        { year: 2002, avgRating: 7.3, count: 15, bestTitle: "Z", bestRating: 9.1 },
    ];

    return (
        <main style={{ padding: 24, display: "grid", gap: 28 }}>
            <h1>LinePlot Examples</h1>

            <section>
                <h2>1) Basic number[]</h2>
                <LinePlot data={simple} width={700} height={320} showGrid />
            </section>

            <section>
                <h2>2) Objects + accessors</h2>
                <LinePlot
                    data={objs}
                    width={700}
                    height={320}
                    showGrid
                    x={(d) => d.t}
                    y={(d) => d.v}
                />
            </section>

            <section>
                <h2>3) Tooltips</h2>
                <LinePlot<YearSummary>
                    data={years}
                    width={700}
                    height={320}
                    showGrid
                    x={(d) => d.year}
                    y={(d) => d.avgRating}
                    pointTitle={(d) =>
                        `${d.year}\nAvg: ${d.avgRating.toFixed(2)} (n=${d.count})\nTop: ${d.bestTitle} (${d.bestRating.toFixed(1)})`
                    }
                />
            </section>

            <section>
                <h2>4) Styling + domains</h2>
                <LinePlot
                    data={simple}
                    width={700}
                    height={320}
                    xDomain={[0, 6]}
                    yDomain={[0, 80]}
                    showGrid
                    strokeWidth={2}
                    pointRadius={4}
                />
            </section>
        </main>
    );
}