export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import os
import fs from 'fs'

const execFileAsync = promisify(execFile)
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'snapshots')

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdir(TEMP_DIR, { recursive: true })
}

function isAuthorized(request: Request) {
  // For browser uploads from authenticated users, we can check session/auth
  // For now, we'll allow the request if the user is authenticated via Next.js auth
  // In production, you might want to add more specific authorization
  return true // Simplified for now - adjust based on your auth system
}

export async function POST(request: Request) {
  try {
    // Parse multipart/form-data
    const formData = await request.formData()
    const file = formData.get('image') as File
    const courseId = formData.get('courseId') as string
    const sectionId = formData.get('sectionId') as string
    const timestamp = formData.get('timestamp') as string
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 })
    }

    if (!courseId || !sectionId) {
      return NextResponse.json({ success: false, error: 'Missing courseId or sectionId' }, { status: 400 })
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save to temporary file for processing
    const timestampStr = timestamp || Date.now().toString()
    const tempFilename = `snapshot_${sectionId}_${timestampStr}.jpg`
    const tempFilePath = path.join(TEMP_DIR, tempFilename)
    
    await writeFile(tempFilePath, buffer)

    try {
      // Prepare model data - in a real implementation, you'd fetch this from database
      // For now, we'll use a placeholder - you'll need to implement proper model loading
      const modelData = {
        "course_id": courseId,
        // These would normally come from your database/models
        "top_models": {},
        "label_encoder": null,
        "distance_threshold": 0.24,
        "ensemble_min_confidence": 92.0,
        "ensemble_per_model_min_confidence": 92.0,
        "reference_embeddings": [],
        "reference_labels": []
      }

      // Call the Python recognition wrapper
      const pythonPath = process.env.PYTHON_PATH || 'python3'
      const scriptPath = path.join(process.cwd(), 'app', 'api', 'camera', 'snapshot', 'recognize-wrapper.py')
      
      // Convert image to base64 for passing to Python script
      const imageBase64 = buffer.toString('base64')
      const modelDataJson = JSON.stringify(modelData)
      
      const { stdout, stderr } = await execFileAsync(
        pythonPath,
        [scriptPath, imageBase64, modelDataJson],
        { timeout: 30000 } // 30 second timeout
      )

      if (stderr) {
        console.warn('Python script stderr:', stderr)
      }

      let result
      try {
        result = JSON.parse(stdout.trim())
      } catch (parseErr) {
        console.error('Failed to parse Python output:', stdout)
        throw new Error('Invalid response from recognition service')
      }

      // Clean up temp file
      try {
        await fs.promises.unlink(tempFilePath)
      } catch (cleanupErr) {
        console.warn('Failed to cleanup temp file:', cleanupErr)
      }
      
      if (!result.success) {
        return NextResponse.json({ 
          success: false, 
          error: result.error || 'Unknown error in recognition' 
        }, { status: 500 })
      }

      // Add timestamp to records
      const recordsWithTimestamp = result.data.records.map(record => ({
        ...record,
        timestamp: new Date().toISOString()
      }))

      return NextResponse.json({
        success: true,
        data: {
          records: recordsWithTimestamp,
          count: recordsWithTimestamp.length
        }
      })
      
    } catch (processingError) {
      console.error('Processing error:', processingError)
      
      // Clean up temp file on error
      try {
        await fs.promises.unlink(tempFilePath)
      } catch (cleanupErr) {
        console.warn('Failed to cleanup temp file after error:', cleanupErr)
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to process image for attendance: ' + (processingError instanceof Error ? processingError.message : String(processingError))
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error processing snapshot:', error)
    return NextResponse.json({ success: false, error: 'Failed to process snapshot: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}

// Optional: GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: "Camera snapshot API endpoint is live" 
  })
}