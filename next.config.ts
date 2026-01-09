import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    devIndicators: false,

    images: {
        // ✅ allow quality used in <Image />
        qualities: [70, 75, 100],

        // ✅ allow external images
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images4.alphacoders.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
                pathname: "/**",
            },
        ],
    },
};

export default nextConfig;
