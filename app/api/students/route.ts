import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Student } from '@/lib/models';

export async function GET() {
  try {
    await dbConnect();
    // Return summary data for the dashboard to keep payload small
    const students = await Student.find({}, {
      studentId: 1,
      name: 1,
      department: 1,
      year: 1,
      riskScore: 1,
      riskLevel: 1,
      interventionStatus: 1
    }).lean();

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Expected an array of students" }, { status: 400 });
    }

    // Bulk upsert
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

    return NextResponse.json({ success: true, count: ops.length });
  } catch (error: any) {
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    await Student.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
