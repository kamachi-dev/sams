import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import SamsError from "@/app/components/SamsError";
import "./globals.css";

// Keep env evaluated at build for client provider; not used here directly.

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "SAMS",
    description: "A Facial Recognition Based Attendance Management System",
    keywords: ["attendance", "facial recognition", "management", "mmcl"],
    authors: [{ name: "MMCL", url: "https://mcl.edu.ph" }],
    icons: {
        icon: "/images/mmcl-logo.png",
    }
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <Providers>
                    {children}
                    <SamsError />
                </Providers>
            </body>
        </html>
    );
}
