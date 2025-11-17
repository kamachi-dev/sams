import { NextResponse } from 'next/server'
import supabase from '@/app/services/supa'

export async function GET() {
    const { data, error } = await supabase.from('user').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const { email } = await request.json();

    if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("user")
        .select("role")
        .eq("email", email)
        .single();

    if (error || !data) {
        console.error("Supabase error:", error);
        return NextResponse.json({ error: "Unable to retrieve user data" }, { status: 500 });
    }

    return NextResponse.json({ role: data.role });
}