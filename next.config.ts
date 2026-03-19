import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ['100.103.137.37'],
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin-allow-popups",
                    },
                ],
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "img.clerk.com",
            },
            {
                protocol: "https",
                hostname: "images.clerk.dev",
            }
        ],
    },
};

export default nextConfig;
