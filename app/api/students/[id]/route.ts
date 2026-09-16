import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Student } from '@/lib/models';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const student = await Student.findOne({ studentId: id }).lean();
    
    if (!student) {
      return NextResponse.json({ error: `Student ${id} not found` }, { status: 404 });
    }

    return NextResponse.json({ student });
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
    await dbConnect();
    const { id } = await params;
    const updateData = await request.json();

    const updatedStudent = await Student.findOneAndUpdate(
      { studentId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedStudent) {
      return NextResponse.json({ error: `Student ${id} not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    console.error(`PATCH /api/students/[id] error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
