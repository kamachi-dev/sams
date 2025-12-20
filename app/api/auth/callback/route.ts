import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import db from "@/app/services/database";

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
        userData = (await db.query(
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

    //DELETE THIS UPON PRODUCTION DEPLOYMENT, PROPER ID HANDLING MUST BE MADE IN THE FUTURE
    try {
        (await db.query(
            "UPDATE account SET id = $1 WHERE email = $2 RETURNING *",
            [user.id, email]
        ));
    }
    catch (error) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: {
                message: error
            },
            error: "User ID could not be updated"
        });
    }
    /////////////////////////////////////////

    try {
        (await db.query(
            "UPDATE account SET pfp = $1 WHERE id = $2 RETURNING *",
            [user.imageUrl, user.id]
        ));
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

    try {
        (await db.query(
            "UPDATE account SET username = $1 WHERE id = $2 RETURNING *",
            [user.fullName, user.id]
        ));
    }
    catch (error) {
        return NextResponse.json({
            success: false,
            status: 401,
            data: {
                message: error
            },
            error: "Username could not be updated"
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