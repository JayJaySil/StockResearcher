import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from "@/lib/s3Client";

const uploadRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  size: z.number()
})

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = uploadRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body' }, 
        { status: 400 });
    }

    const { fileName, contentType, size } = validation.data;

    // Use a proper UUID value (call the function), not the function reference
    const uniqueKey = `${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
      ContentLength: size
    })

    const presignedUrl = await getSignedUrl(S3, command, { expiresIn: 360 });

    const response = {
      presignedUrl,
      key: uniqueKey,
    }

    return NextResponse.json(response, { status: 200 });

  } catch {
    return NextResponse.json(
      { error: 'Upload failed' }, 
      { status: 500 });
  }
}
