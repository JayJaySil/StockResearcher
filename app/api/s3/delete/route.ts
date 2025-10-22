import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "@/lib/s3Client";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const key = body.key;
    if (!key) {
      return NextResponse.json('Key is required', { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    await S3.send(command);

    return NextResponse.json('File deleted successfully', { status: 200 });

  } catch {
    return NextResponse.json('Delete failed', { status: 500 });
  }

}