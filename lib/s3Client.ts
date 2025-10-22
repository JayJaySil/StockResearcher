import { S3Client } from "@aws-sdk/client-s3";

// Lightweight S3 client configured for the t3.storage.dev endpoint.
// Used for presigned URLs and basic S3 ops in server routes.
export const S3 = new S3Client({
  region: 'auto',
  endpoint: 'https://t3.storage.dev',
  forcePathStyle: false,
})
