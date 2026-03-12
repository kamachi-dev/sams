"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { Toast } from "radix-ui";
import React from "react";
import { useServiceWorker } from "@/lib/useServiceWorker";

type Props = {
    children: React.ReactNode;
};

function ServiceWorkerInitializer() {
    useServiceWorker();
    return null;
}

export default function Providers({ children }: Props) {
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (!clerkKey) return (
        <Toast.Provider>
            <ServiceWorkerInitializer />
            {children}
        </Toast.Provider>
    );
    else return (
        <ClerkProvider publishableKey={clerkKey}>
            <Toast.Provider swipeDirection="right">
                <ServiceWorkerInitializer />
                {children}
            </Toast.Provider>
        </ClerkProvider>
    );
}
