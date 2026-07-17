// /api/train/route.ts
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'

export async function POST(req: Request) {
    const { courseId } = await req.json()
    if (!courseId) {
        return NextResponse.json({ success: false, error: 'Missing courseId' }, { status: 400 })
    }
    
    const pythonPath = process.env.PYTHON_PATH || 'python'
    const scriptPath = path.join(process.cwd(), 'camera-agent', 'train.py')
    
    // Call the Python script with the courseId as argument
    exec(`"${pythonPath}" "${scriptPath}" ${courseId}`, (error, stdout, stderr) => {
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