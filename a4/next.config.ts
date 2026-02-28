import type { NextConfig } from "next";

const repoName = "a4-linkedviews";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
    output: "export", // ✅ makes /out for GitHub Pages
    basePath: isProd ? `/${repoName}` : "",
    assetPrefix: isProd ? `/${repoName}/` : "",
    images: {
        unoptimized: true, // ✅ required for static export on Pages
    },
};

export default nextConfig;