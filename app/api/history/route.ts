import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { UploadHistory } from '@/lib/models';

export async function GET() {
  try {
    await dbConnect();
    const history = await UploadHistory.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const newRecord = await UploadHistory.create(data);
    return NextResponse.json({ success: true, record: newRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await UploadHistory.deleteOne({ id });
      return NextResponse.json({ success: true });
    } else {
      await UploadHistory.deleteMany({});
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
