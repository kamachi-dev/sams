export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import db from '@/app/services/database'
import * as XLSX from 'xlsx'
import { parse as parseCsv } from 'csv-parse/sync'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return Response.json({ success: false, status: 400, data: null, error: "No file provided" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        let values: string[][] = []

        if (file.name.endsWith(".xlsx")) {
            const workbook = XLSX.read(buffer)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            values = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        }
        else if (file.name.endsWith(".csv")) {
            values = parseCsv(buffer, { skip_empty_lines: true })
        }
        else {
            return Response.json({ success: false, status: 400, data: null, error: "Unsupported file type" }, { status: 400 })
        }

        const data = (await db.query(
            `INSERT INTO account ( id, username, email, role ) VALUES ${values.map((row) => `('${row[1]}', '${row[0]}', '${row[1]}', 1)`).join(', ')}
            RETURNING *`
        )).rows

        return NextResponse.json({ success: true, status: 200, data, error: null })
    } catch (error) {
        return NextResponse.json({ success: false, status: 500, data: { message: error }, error: 'Teachers import failed' })
    }
}

export async function GET() {
    try {
        const data = (await db.query(
            `SELECT * FROM account WHERE role = 1
              AND id IN (
                SELECT DISTINCT teacher FROM course
                WHERE school_year = (SELECT active_school_year FROM meta WHERE id='1')
              )`
        )).rows
        return NextResponse.json({ success: true, status: 200, data, error: null })
    } catch (error) {
        return NextResponse.json({ success: false, status: 500, data: { message: error }, error: 'Teachers fetch failed' })
    }
}

export async function DELETE(req: Request) {
    try {
        const formData = await req.formData();
        const id = formData.get('id');

        if (!id) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'No id provided' }, { status: 400 })
        }

        const data = (await db.query(
            `DELETE FROM account WHERE id='${String(id)}' RETURNING *`
        )).rows

        return NextResponse.json({ success: true, status: 200, data, error: null })
    } catch (error) {
        return NextResponse.json({ success: false, status: 500, data: { message: String(error) }, error: 'Teachers delete failed' })
    }
}