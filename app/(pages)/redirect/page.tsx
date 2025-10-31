import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import supabase from "@/app/services/supa";

export default async function Redirect() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) redirect("/");

    const { data, error } = await supabase
        .from("user")
        .select("role")
        .eq("email", session.user.email)
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