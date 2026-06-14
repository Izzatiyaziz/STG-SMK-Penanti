import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss: http://127.0.0.1:8000 http://localhost:8000",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
].join("; ");

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

    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: contentSecurityPolicy,
                    },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    ...(isDevelopment
                        ? []
                        : [
                              {
                                  key: "Strict-Transport-Security",
                                  value: "max-age=31536000; includeSubDomains",
                              },
                          ]),
                ],
            },
        ];
    },
};

export default nextConfig;
