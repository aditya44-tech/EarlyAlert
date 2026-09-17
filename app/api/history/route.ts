import { NextResponse } from 'next/server';
import dbConnect, { isDbConnected } from '@/lib/dbConnect';
import { UploadHistory } from '@/lib/models';
import { getUploadHistory, addUploadHistory, deleteUploadHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
        console.log('[API History] Attempting to create record in MongoDB...');
        const newRecord = await UploadHistory.create(data);
        console.log('[API History] Successfully created record with ID:', newRecord._id);
        return NextResponse.json({ success: true, record: newRecord });
      } catch (err: any) {
        console.error("[API History] MongoDB history create failed:", err.message, err);
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

    deleteUploadHistory(id || undefined, uploadedAt || undefined);

    if (await isDbConnected()) {
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

