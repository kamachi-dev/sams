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

    let userData;

    try {
        userData = (await supabase.query(
            "SELECT * FROM account WHERE email = $1 LIMIT 1",
            [email]
        )).rows[0];
    }
    catch (error) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: {
                message: error
            },
            error: "User data could not be retrieved"
        });
    }

    try {
        const updateData = (await supabase.query(
            "UPDATE account SET pfp = $1 WHERE email = $2 RETURNING *",
            [user.imageUrl, email]
        )).rows[0];
    }
    catch (error) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: {
                message: error
            },
            error: "User profile picture could not be updated"
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