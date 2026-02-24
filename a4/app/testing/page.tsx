import LinePlot from "@/components/LinePlot";

export default function Page() {
    const data = [10, 30, 20, 50, 40, 60, 45];

    return (
        <main style={{ padding: 24 }}>
            <h1>My Line Plot</h1>
            <LinePlot
                data={data}
                width={700}
                height={400}
            />
        </main>
    );
}