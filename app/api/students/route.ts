import { NextResponse } from 'next/server';
import dbConnect, { isDbConnected } from '@/lib/dbConnect';
import { Student } from '@/lib/models';
import { getAllStudents, bulkUpsertStudents, clearAllStudents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (await isDbConnected()) {
      const dbStudents = await Student.find({}, {
        studentId: 1,
        name: 1,
        department: 1,
        year: 1,
        riskScore: 1,
        riskLevel: 1,
        interventionStatus: 1
      }).lean();

      if (dbStudents && dbStudents.length > 0) {
        return NextResponse.json(dbStudents);
      }
    }
  } catch (error: any) {
    console.warn("MongoDB query failed, falling back to in-memory students:", error.message);
  }

  // In-memory fallback
  const fallbackStudents = getAllStudents();
  return NextResponse.json(fallbackStudents);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Expected an array of students" }, { status: 400 });
    }

    // Always update in-memory store
    bulkUpsertStudents(data);

    if (await isDbConnected()) {
      try {
        const ops = data.map((student: any) => ({
          updateOne: {
            filter: { studentId: student.studentId },
            update: { $set: student },
            upsert: true
          }
        }));

        if (ops.length > 0) {
          await Student.bulkWrite(ops);
        }
      } catch (err: any) {
        console.warn("MongoDB bulkWrite failed:", err.message);
      }
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error: any) {
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    clearAllStudents();

    if (await isDbConnected()) {
      try {
        await Student.deleteMany({});
      } catch (err: any) {
        console.warn("MongoDB deleteMany failed:", err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

