"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { Toast } from "radix-ui";
import React from "react";
import { useServiceWorker } from "@/lib/useServiceWorker";
import { DatabaseInitializer } from "@/app/components/DatabaseInitializer";

type Props = {
    children: React.ReactNode;
};

function ServiceWorkerInitializer() {
    useServiceWorker();
    return null;
}

function AppInitializer() {
    return (
        <>
            <DatabaseInitializer />
            <ServiceWorkerInitializer />
        </>
    );
}

export default function Providers({ children }: Props) {
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (!clerkKey) return (
        <Toast.Provider>
            <AppInitializer />
            {children}
        </Toast.Provider>
    );
    else return (
        <ClerkProvider publishableKey={clerkKey}>
            <Toast.Provider swipeDirection="right">
                <AppInitializer />
                {children}
            </Toast.Provider>
        </ClerkProvider>
    );
}
