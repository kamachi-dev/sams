import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import SamsError from "@/app/components/SamsError";
import "./globals.css";
import { Toast } from "radix-ui";

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
        <ClerkProvider>
            <Toast.Provider swipeDirection="right">
                <html lang="en">
                    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                        {children}
                        <SamsError />
                    </body>
                </html>
            </Toast.Provider>
        </ClerkProvider>
    );
}
