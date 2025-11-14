import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import supabase from "@/app/services/supa";

const ROLE_ROUTES = {
    0: "/admin-portal",
    1: "/teacher-portal",
    2: "/parent-portal",
    3: "/student-portal",
} as const;

type UserRole = keyof typeof ROLE_ROUTES;

export default async function PopupComplete() {
    const user = await currentUser();

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
        redirect("/");
    }

    const { data, error } = await supabase
        .from("user")
        .select("role")
        .eq("email", email)
        .single();

    if (error || !data) {
        console.error("Failed to fetch user role:", error?.message);
        redirect("/");
    }

    const targetRoute = ROLE_ROUTES[data.role as UserRole] || "/";
    redirect(targetRoute);
}
