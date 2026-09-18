import { NextResponse } from 'next/server';
import dbConnect, { isDbConnected } from '@/lib/dbConnect';
import { UploadHistory, Student } from '@/lib/models';
import { getUploadHistory, addUploadHistory, deleteUploadHistory, getUploadRecord, revertUpload } from '@/lib/db';

export async function GET() {
  try {
    if (await isDbConnected()) {
      try {
        const history = await UploadHistory.find({}).sort({ createdAt: -1 }).lean();
        if (history && history.length > 0) {
          return NextResponse.json(history);
        }
      } catch (err: any) {
        console.warn("MongoDB history find failed:", err.message);
      }
    }

    return NextResponse.json(getUploadHistory());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const memoryRecord = addUploadHistory(data);

    if (await isDbConnected()) {
      try {
        // Use memoryRecord instead of data because memoryRecord has the auto-generated 'id'
        const newRecord = await UploadHistory.create(memoryRecord);
        return NextResponse.json({ success: true, record: newRecord });
      } catch (err: any) {
        console.warn("MongoDB history create failed:", err.message);
      }
    }

    return NextResponse.json({ success: true, record: memoryRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const uploadedAt = searchParams.get('uploadedAt');
    const dbConnected = await isDbConnected();

    let record: any = getUploadRecord({ id: id || undefined, uploadedAt: uploadedAt || undefined });

    // The log may only exist in MongoDB (e.g. after a server restart)
    if (!record && dbConnected && (id || uploadedAt)) {
      try {
        record = await UploadHistory.findOne(id ? { id } : { uploadedAt }).lean();
      } catch (err: any) {
        console.warn("MongoDB history lookup failed:", err.message);
      }
    }

    let revertedStudentIds: string[] = [];
    let removedStudentIds: string[] = [];

    if (record) {
      // Roll the students back to their pre-upload state (authoritative, server-side)
      const result = revertUpload(record);
      revertedStudentIds = result.revertedStudents.map(s => s.studentId);
      removedStudentIds = result.removedStudentIds;

      if (dbConnected) {
        try {
          for (const student of result.revertedStudents) {
            await Student.findOneAndUpdate(
              { studentId: student.studentId },
              { $set: student },
              { upsert: true }
            );
          }
          if (removedStudentIds.length > 0) {
            await Student.deleteMany({ studentId: { $in: removedStudentIds } });
          }
        } catch (err: any) {
          console.warn("MongoDB student revert failed:", err.message);
        }
      }
    }

    deleteUploadHistory(id || undefined, uploadedAt || undefined);

    if (dbConnected) {
      try {
        if (id) {
          await UploadHistory.deleteOne({ id });
        } else if (uploadedAt) {
          await UploadHistory.deleteOne({ uploadedAt });
        } else {
          await UploadHistory.deleteMany({});
        }
      } catch (err: any) {
        console.warn("MongoDB history delete failed:", err.message);
      }
    }

    return NextResponse.json({ success: true, revertedStudentIds, removedStudentIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

