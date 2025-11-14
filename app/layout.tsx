import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const metadata: Metadata = {
    title: "SAMS",
    description: "A Facial Recognition Based Attendance Management System",
    keywords: ["attendance", "facial recognition", "management", "mmcl"],
    authors: [{ name: "MMCL", url: "https://mcl.edu.ph" }],
    viewport: {
        width: "device-width",
        initialScale: 1,
    },
    icons: {
        icon: "/images/mmcl-logo.png",
    }
};

export { metadata };

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}
