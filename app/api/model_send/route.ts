import { NextResponse } from "next/server"
import db from "@/app/services/database"

export async function POST(req: Request) {
  try {
    const { courseId, modelBase64 } = await req.json()

    // store model base64 into `course.model_pickle` (table is named `course`)
    await db.query(
      "UPDATE course SET model_pickle = $1 WHERE id = $2",
      [modelBase64, courseId]
    )

    return NextResponse.json({ message: "Model stored successfully" })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }
}
