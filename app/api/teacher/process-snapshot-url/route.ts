export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { readCameraSettings } from '@/app/services/camera-settings';
import db from '@/app/services/database';
import { delimiter, isAbsolute, join, relative, resolve } from 'node:path';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawn } from 'child_process';

// Singleton pattern for caching model data per course/section to avoid repeated DB queries
let modelCache: Map<string, { data: any; timestamp: number }> = new Map();
const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getModelData = async (courseId: string, sectionName: string): Promise<any> => {
  const cacheKey = `${courseId}:${sectionName}`;
  const cached = modelCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < MODEL_CACHE_TTL)) {
    return cached.data;
  }

  try {
    const result = await db.query(`
      SELECT cm.model_path, cm.model_pickle
      FROM course_models cm
      INNER JOIN section s ON cm.course_id = s.id
      INNER JOIN course c ON s.course = c.id
      WHERE c.id = $1
        AND s.name = $2
        AND cm.section = $2
        AND c.school_year = (SELECT active_school_year FROM meta WHERE id='1')
      ORDER BY cm.updated_at DESC
      LIMIT 1
    `, [courseId, sectionName]);

    if (result.rows.length === 0) {
      throw new Error(`No model found for course ${courseId}, section ${sectionName}`);
    }

    const row = result.rows[0];
    let modelData: { model_path?: string; model_base64?: string; courseId: string };

    if (row.model_path) {
      const modelPath = resolve(row.model_path);
      const relativePath = relative(resolve(process.cwd(), 'models', 'face-recognition'), modelPath);
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        throw new Error('Model path is outside the configured model directory');
      }
      if (!existsSync(modelPath)) {
        throw new Error('Stored model file was not found on the server');
      }
      modelData = { model_path: modelPath, courseId };
    } else {
      let modelBuffer: Buffer;
      if (Buffer.isBuffer(row.model_pickle)) {
        modelBuffer = row.model_pickle;
      } else if (typeof row.model_pickle === 'string' && row.model_pickle.startsWith('\\x')) {
        modelBuffer = Buffer.from(row.model_pickle.slice(2), 'hex');
      } else if (typeof row.model_pickle === 'string' && row.model_pickle.length > 0) {
        modelBuffer = Buffer.from(row.model_pickle, 'base64');
      } else {
        throw new Error('Model data is empty');
      }
      modelData = { model_base64: modelBuffer.toString('base64'), courseId };
    }

    // Cache the result
    modelCache.set(cacheKey, { data: modelData, timestamp: Date.now() });

    return modelData;
  } catch (error) {
    console.error('Error fetching model data:', error);
    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get request body - expecting either:
    // Option 1: { image_base64: "...", course_id: "...", section: "..." }
    // Option 2: { url: "/snapshots/.../snapshot_....jpg" } (existing format)
    // Option 3: multipart/form-data with image file

    const contentType = request.headers.get('content-type') || '';
    let imageBase64: string | null = null;
    let courseId: string | null = null;
    let sectionName: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Handle base64 image format
      if (body.image_base64) {
        imageBase64 = body.image_base64;
        courseId = typeof body.course_id === 'string' ? body.course_id : null;
        sectionName = typeof body.section === 'string' ? body.section : null;

        if (!courseId || !sectionName) {
          const config = await readCameraSettings(user.id);
          if (!config.courseName || !config.section) {
            return NextResponse.json(
              { success: false, error: 'Camera not configured. Please set course and section first.' },
              { status: 400 }
            );
          }

          const courseResult = await db.query(
            `SELECT id FROM course WHERE name = $1 AND school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
            [config.courseName]
          );
          if (courseResult.rows.length === 0) {
            return NextResponse.json(
              { success: false, error: `Course not found: ${config.courseName}` },
              { status: 404 }
            );
          }

          courseId = courseResult.rows[0].id;
          sectionName = config.section;
        }
      }
      // Handle existing URL format
      else if (body.url) {
        // Convert URL to file path and read the image
        if (!body.url.startsWith('/snapshots/')) {
          return NextResponse.json(
            { success: false, error: 'Invalid snapshot URL format' },
            { status: 400 }
          );
        }

        const filepath = join(process.cwd(), 'public', body.url);
        if (!existsSync(filepath)) {
          return NextResponse.json(
            { success: false, error: 'Snapshot file not found' },
            { status: 404 }
          );
        }

        const buffer = readFileSync(filepath);
        imageBase64 = buffer.toString('base64');

        // For URL format, we need to get course/section from user's camera settings
        const config = await readCameraSettings(user.id);
        if (!config.courseName || !config.section) {
          return NextResponse.json(
            { success: false, error: 'Camera not configured. Please set course and section first.' },
            { status: 400 }
          );
        }

        // We need to get the course_id for the course_name
        const courseResult = await db.query(
          `SELECT id FROM course WHERE name = $1 AND school_year = (SELECT active_school_year FROM meta WHERE id='1')`,
          [config.courseName]
        );

        if (courseResult.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: `Course not found: ${config.courseName}` },
            { status: 404 }
          );
        }

        courseId = courseResult.rows[0].id;
        sectionName = config.section;
      }
    } else if (contentType.includes('multipart/form-data')) {
      // Handle file upload - for now, we'll focus on the JSON formats
      // Multipart handling would require additional libraries like busboy or formidable
      return NextResponse.json(
        { success: false, error: 'Multipart file upload not implemented yet' },
        { status: 501 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported content type. Use application/json.' },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image data provided' },
        { status: 400 }
      );
    }

    if (!courseId || !sectionName) {
      return NextResponse.json(
        { success: false, error: 'Course ID and section are required' },
        { status: 400 }
      );
    }

    // Get model data for this course/section
    const modelData = await getModelData(courseId, sectionName);

    if (!modelData || (!modelData.model_path && !modelData.model_base64)) {
      return NextResponse.json(
        { success: false, error: 'Failed to load model data' },
        { status: 500 }
      );
    }

    // Prepare arguments for the Python script
    const scriptPath = join(process.cwd(), 'app', 'api', 'camera', 'snapshot', 'recognize-wrapper.py');

    // Verify the script exists
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { success: false, error: 'Recognition script not found' },
        { status: 500 }
      );
    }

    const workDir = mkdtempSync(join(tmpdir(), 'sams-recognition-'));
    const imagePath = join(workDir, 'snapshot.jpg');
    writeFileSync(imagePath, Buffer.from(imageBase64, 'base64'));

    let modelPath = modelData.model_path;
    if (!modelPath && modelData.model_base64) {
      modelPath = join(workDir, 'model.joblib');
      writeFileSync(modelPath, Buffer.from(modelData.model_base64, 'base64'));
    }

    if (!modelPath) {
      rmSync(workDir, { recursive: true, force: true });
      return NextResponse.json(
        { success: false, error: 'Failed to load model file' },
        { status: 500 }
      );
    }

    return new Promise<NextResponse>((resolveResponse) => {
      let settled = false;
      let timedOut = false;
      let timeout: NodeJS.Timeout;
      const cleanup = () => rmSync(workDir, { recursive: true, force: true });
      const complete = (response: NextResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolveResponse(response);
      };
      const pythonProcess = spawn(process.env.PYTHON_PATH || 'python', [
        scriptPath,
        imagePath,
        modelPath
      ], {
        env: {
          ...process.env,
          PYTHONPATH: [process.env.PYTHONPATH, join(process.cwd(), 'camera-agent')]
            .filter(Boolean)
            .join(delimiter)
        },
        windowsHide: true
      });

      timeout = setTimeout(() => {
        timedOut = true;
        pythonProcess.kill();
      }, 120_000);

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (timedOut) {
          complete(NextResponse.json(
            { success: false, error: 'Face recognition processing timed out' },
            { status: 504 }
          ));
          return;
        }

        if (code !== 0) {
          console.error(`Python process exited with code ${code}:`, stderrData || stdoutData);
          let processError = stderrData || stdoutData || 'Unknown recognition error';
          try {
            const errorResult = JSON.parse(stdoutData.trim());
            processError = errorResult.error || processError;
          } catch {}
          complete(NextResponse.json(
            { success: false, error: `Face recognition processing failed: ${processError}` },
            { status: 500 }
          ));
          return;
        }

        try {
          const result = JSON.parse(stdoutData.trim());
          complete(NextResponse.json({
            success: true,
            data: {
              recognized: result.data?.records || [],
              count: result.data?.count || 0,
              processedAt: new Date().toISOString(),
              courseId: modelData.courseId,
              section: sectionName
            }
          }));
        } catch (parseError) {
          console.error('Failed to parse Python script output:', stdoutData, parseError);
          complete(NextResponse.json(
            { success: false, error: 'Invalid response from recognition service' },
            { status: 500 }
          ));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        complete(NextResponse.json(
          { success: false, error: 'Failed to initialize recognition service' },
          { status: 500 }
        ));
      });
    });
  } catch (error) {
    console.error('Snapshot processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Processing failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}