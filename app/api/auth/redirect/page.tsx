"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Spinner } from "@radix-ui/themes";

export default function Redirect() {
    const router = useRouter();
    const { user, isLoaded } = useUser();

    useEffect(() => {
        async function handleRedirect() {
            if (!isLoaded) return;

            console.log("Logging In");
            console.log("Clerk user:", user);

            const email = user?.primaryEmailAddress?.emailAddress;
            if (!email) {
                router.push("/");
                return;
            }

            try {
                const response = await fetch("/api/user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });

                const { role, error } = await response.json();

                if (error || role === undefined) {
                    console.error("API error:", error);
                    router.push(`/?error=${encodeURIComponent("Unable to retrieve user data.")}`);
                    return;
                }

                switch (role) {
                    case 0:
                        router.push("/admin-portal");
                        break;
                    case 1:
                        router.push("/teacher-portal");
                        break;
                    case 2:
                        router.push("/parent-portal");
                        break;
                    case 3:
                        router.push("/student-portal");
                        break;
                    default:
                        router.push(`/?error=${encodeURIComponent("Invalid user role.")}`);
                }
            } catch (err) {
                console.error("Fetch error:", err);
                router.push(`/?error=${encodeURIComponent("Unable to retrieve user data.")}`);
            }
        }

        handleRedirect();
    }, [isLoaded, user, router]);

    return (
        <>
            <p>Loading...</p>
            <Spinner />
            <p>Redirecting to User dashboard, please wait a second</p>
        </>
    );
}