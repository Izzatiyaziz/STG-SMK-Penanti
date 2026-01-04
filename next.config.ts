import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images4.alphacoders.com",
                pathname: "/**",
            },
        ],
    },
};

export default nextConfig;
