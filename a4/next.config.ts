import type { NextConfig } from "next";

const repoName = "a4-linkedviews";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
    output: "export",
    basePath: isProd ? `/${repoName}` : "",
    assetPrefix: isProd ? `/${repoName}/` : "",
    trailingSlash: true,
    images: {
        unoptimized: true,
    },

    env: {
        NEXT_PUBLIC_BASE_PATH: isProd ? `/${repoName}` : "",
    }
};

export default nextConfig;

