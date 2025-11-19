"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { Toast } from "radix-ui";
import React from "react";

type Props = {
    children: React.ReactNode;
};

export default function Providers({ children }: Props) {
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    return (
        <ClerkProvider publishableKey={clerkKey}>
            <Toast.Provider swipeDirection="right">
                {children}
            </Toast.Provider>
        </ClerkProvider>
    );
}
