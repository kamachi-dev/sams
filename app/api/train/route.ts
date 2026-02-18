// /api/train/route.ts
import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(req: Request) {
    const { courseId } = await req.json()
    if (!courseId) {
        return NextResponse.json({ success: false, error: 'Missing courseId' }, { status: 400 })
    }
    // Call the Python script with the courseId as argument
    exec(`python "C:/Users/Windows 11/Downloads/Deepface Contents/Camera-Attendance-App/TestingEnsembleV4.py" ${courseId}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Training error:', error)
        }
        if (stderr) {
            console.error('Training stderr:', stderr)
        }
        console.log('Training stdout:', stdout)
    })
    return NextResponse.json({ success: true, message: 'Training started' })
}