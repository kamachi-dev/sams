import { NextResponse } from 'next/server'
import supabase from '@/app/services/supa'

export async function GET() {
    const { data, error } = await supabase.from('user').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const data = await request.json()
    return NextResponse.json({ receivedData: data })
}