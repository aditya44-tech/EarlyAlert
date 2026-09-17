import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isDbConnected } from '@/lib/dbConnect';
import { Student } from '@/lib/models';
import { getStudentDetail, updateStudentRisk, upsertStudent } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (await isDbConnected()) {
      try {
        const student = await Student.findOne({ studentId: id }).lean();
        if (student) {
          return NextResponse.json({ student });
        }
      } catch (err: any) {
        console.warn(`MongoDB findOne failed for ${id}:`, err.message);
      }
    }

    // In-memory fallback
    const fallbackStudent = getStudentDetail(id);
    if (!fallbackStudent) {
      return NextResponse.json({ error: `Student ${id} not found` }, { status: 404 });
    }

    return NextResponse.json({ student: fallbackStudent });
  } catch (error: any) {
    console.error(`GET /api/students/[id] error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await request.json();

    // Always update in-memory
    updateStudentRisk(id, updateData);
    let memoryStudent = getStudentDetail(id);
    if (memoryStudent) {
      upsertStudent({ ...memoryStudent, ...updateData });
      memoryStudent = getStudentDetail(id);
    }

    if (await isDbConnected()) {
      try {
        const updatedStudent = await Student.findOneAndUpdate(
          { studentId: id },
          { $set: updateData },
          { new: true, runValidators: true }
        ).lean();

        if (updatedStudent) {
          return NextResponse.json({ success: true, student: updatedStudent });
        }
      } catch (err: any) {
        console.warn(`MongoDB findOneAndUpdate failed for ${id}:`, err.message);
      }
    }

    if (!memoryStudent) {
      return NextResponse.json({ error: `Student ${id} not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: memoryStudent });
  } catch (error: any) {
    console.error(`PATCH /api/students/[id] error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

