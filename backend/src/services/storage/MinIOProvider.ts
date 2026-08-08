import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider, UploadSession } from './StorageProvider';

export class MinIOProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'hiring-platform';
    this.client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      region: process.env.MINIO_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async generateUploadUrl(fileName: string, contentType: string, folder: string = 'videos'): Promise<UploadSession> {
    const ext = fileName.split('.').pop() || 'mp4';
    const fileId = `${folder}/${uuidv4()}.${ext}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
      ContentType: contentType,
    });

    const expiresInSeconds = 3600; // 1 hour
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    return {
      uploadUrl,
      fileId,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async generateSignedReadUrl(fileId: string, expiresInSeconds: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(fileId: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
    });

    await this.client.send(command);
  }
}

// Export a singleton instance
export const minioStorage = new MinIOProvider();
