import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import supabase from "@/app/services/supa";

export async function GET() {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: null,
            error: "Not signed in"
        });
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: null,
            error: "User not registered"
        });
    }

    const { data: userData, error } = await supabase
        .from("user")
        .select("role")
        .eq("email", email)
        .single();

    if (error || !userData) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: null,
            error: "User data could not be retrieved"
        });
    }

    const role: number = userData.role;
    switch (role) {
        case 0:
            return NextResponse.json({
                success: true,
                status: 200,
                data: {
                    path: "/admin-portal"
                },
                error: null
            });
        case 1:
            return NextResponse.json({
                success: true,
                status: 200,
                data: {
                    path: "/teacher-portal"
                },
                error: null
            });
        case 2:
            return NextResponse.json({
                success: true,
                status: 200,
                data: {
                    path: "/parent-portal"
                },
                error: null
            });
        case 3:
            return NextResponse.json({
                success: true,
                status: 200,
                data: {
                    path: "/student-portal"
                },
                error: null
            });
        default:
            return NextResponse.json({
                success: false,
                status: 400,
                data: role,
                error: "user role is invalid"
            });
    }
}