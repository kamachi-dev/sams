import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import supabase from "@/app/services/supa";

export default async function Redirect() {
    const user = await currentUser();

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) redirect("/");

    const { data, error } = await supabase
        .from("user")
        .select("role")
        .eq("email", email)
        .single();

    if (error || !data) {
        console.error("Supabase error:", error);
        redirect("/");
    }

    switch (data.role) {
        case 0:
            redirect("/admin-portal");
        case 1:
            redirect("/teacher-portal");
        case 2:
            redirect("/parent-portal");
        case 3:
            redirect("/student-portal");
        default:
            redirect("/");
    }
}