import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET } from '../config/aws';

export async function uploadDocument(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    })
  );
  return key;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteDocument(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export function s3PublicUrl(key: string): string {
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
}
