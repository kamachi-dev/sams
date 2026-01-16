import { NextResponse } from 'next/server'

type Row = { email?: string; username?: string;[k: string]: unknown }

function parseCsv(csvText: string): Row[] {
    const lines = csvText.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length > 0)
    if (lines.length === 0) return []

    const parseLine = (line: string): string[] => {
        const out: string[] = []
        let cur = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (inQuotes) {
                if (ch === '"') {
                    const next = line[i + 1]
                    if (next === '"') { // escaped quote
                        cur += '"'
                        i++
                    } else {
                        inQuotes = false
                    }
                } else {
                    cur += ch
                }
            } else {
                if (ch === ',') {
                    out.push(cur)
                    cur = ''
                } else if (ch === '"') {
                    inQuotes = true
                } else {
                    cur += ch
                }
            }
        }
        out.push(cur)
        return out.map(s => s.trim())
    }

    const headers = parseLine(lines[0]).map(h => h.trim())
    const rows: Row[] = []
    for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i])
        const obj: Row = {}
        headers.forEach((h, idx) => {
            obj[h] = cols[idx] ?? ''
        })
        rows.push(obj)
    }
    return rows
}

export async function POST(req: Request) {
    try {
        let csvText = ''
        const contentType = req.headers.get('content-type') || ''
        if (contentType.includes('multipart/form-data')) {
            const form = await req.formData()
            const file = form.get('file') as File | null
            if (!file) {
                return NextResponse.json({ success: false, status: 400, data: null, error: 'Missing file' }, { status: 400 })
            }
            csvText = await file.text()
        } else {
            csvText = await req.text()
        }

        if (!csvText?.trim()) {
            return NextResponse.json({ success: false, status: 400, data: null, error: 'Empty CSV payload' }, { status: 400 })
        }

        const records: Row[] = parseCsv(csvText)

        const required = ['email', 'username']
        const invalid: { index: number; reason: string }[] = []
        const valid: Row[] = []

        records.forEach((r, i) => {
            for (const key of required) {
                const val = (r as Record<string, unknown>)[key]
                if (val === undefined || val === null || String(val).trim() === '') {
                    invalid.push({ index: i + 1, reason: `Missing ${key}` })
                    return
                }
            }
            valid.push(r)
        })

        // TODO: Persist teachers to DB if schema is available
        return NextResponse.json({
            success: true,
            status: 200,
            data: { imported: valid.length, invalid },
            error: null,
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to parse CSV'
        return NextResponse.json({ success: false, status: 500, data: null, error: message }, { status: 500 })
    }
}

