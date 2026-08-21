import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getCloudinary } from '../config/cloudinary';

export interface UploadResult {
  url: string;
  resourceType?: string;
  publicId?: string;
}

const isPdf = (mimeType: string): boolean => mimeType === 'application/pdf';

const createTempFileFromBuffer = async (file: Express.Multer.File): Promise<string> => {
  const tmpDir = path.join(os.tmpdir(), 'hiring-platform-uploads');
  await fs.mkdir(tmpDir, { recursive: true });

  const safeName = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_') || 'upload';
  const tempPath = path.join(tmpDir, `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`);
  await fs.writeFile(tempPath, file.buffer);
  return tempPath;
};

const resolveCloudinaryFolder = (folder: string, mimeType: string): string => {
  if (isPdf(mimeType)) return 'resumes';
  if (folder === 'logos' || folder === 'photos' || folder === 'profile-images') return 'profile-images';
  return folder || 'uploads';
};

async function cloudinaryUpload(
  file: Express.Multer.File,
  folder: string,
): Promise<UploadResult> {
  const cloudinary = getCloudinary();
  const tempPath = await createTempFileFromBuffer(file);

  try {
    const isResume = resolveCloudinaryFolder(folder, file.mimetype) === 'resumes';
    const uploadResult = await cloudinary.uploader.upload(tempPath, {
      folder: resolveCloudinaryFolder(folder, file.mimetype),
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      type: 'upload',
    });

    return {
      url: uploadResult.secure_url,
      resourceType: uploadResult.resource_type,
      publicId: uploadResult.public_id,
    };
  } catch (err) {
    const cloudinaryErr = err as {
      message?: string;
      http_code?: number;
      name?: string;
    };
    const reason = (cloudinaryErr.message || 'Unknown Cloudinary error').trim();
    const dependencyStatus = typeof cloudinaryErr.http_code === 'number' ? cloudinaryErr.http_code : undefined;

    const isAuthOrConfigIssue = dependencyStatus === 401 || dependencyStatus === 403;
    throw Object.assign(
      new Error(
        isAuthOrConfigIssue
          ? `Cloudinary authentication failed. Verify CLOUDINARY credentials in deployment variables. Provider reason: ${reason}`
          : `Cloudinary upload failed: ${reason}`,
      ),
      {
        statusCode: isAuthOrConfigIssue ? 500 : 502,
        code: isAuthOrConfigIssue ? 'CLOUDINARY_AUTH_FAILED' : 'CLOUDINARY_UPLOAD_FAILED',
        details: {
          provider: 'cloudinary',
          providerStatus: dependencyStatus || null,
          providerError: reason,
          providerName: cloudinaryErr.name || null,
        },
      },
    );
  } finally {
    await fs.unlink(tempPath).catch(() => undefined);
  }
}

const extractCloudinaryPublicId = (url: string): string | null => {
  if (!url.includes('res.cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

async function deleteFromCloudinary(url: string): Promise<void> {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  const cloudinary = getCloudinary();
  // Try common resource types to support both images and raw files (e.g., PDF resumes).
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => undefined);
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => undefined);
}

export const StorageService = {
  async uploadResume(file: Express.Multer.File): Promise<UploadResult> {
    return cloudinaryUpload(file, 'resumes');
  },

  async uploadPhoto(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    return cloudinaryUpload(file, folder || 'profile-images');
  },

  async uploadAny(file: Express.Multer.File): Promise<UploadResult> {
    const folder = isPdf(file.mimetype) ? 'resumes' : 'profile-images';
    return cloudinaryUpload(file, folder);
  },

  async deleteByUrl(url: string): Promise<void> {
    if (!url) return;

    // Legacy cleanup support for old local file URLs.
    if (url.startsWith('/uploads/')) {
      const relativePath = url.replace('/uploads/', '');
      const fullPath = path.join(__dirname, '../../uploads', relativePath);
      await fs.unlink(fullPath).catch(() => undefined);
      return;
    }

    // Legacy cleanup support for old S3 URLs.
    if (url.includes('amazonaws.com')) {
      const { deleteFromS3 } = await import('../utils/s3');
      await deleteFromS3(url).catch(() => undefined);
      return;
    }

    await deleteFromCloudinary(url).catch(() => undefined);
  },

  generateSignedUrl(fileUrl: string, resourceType: 'image' | 'raw' = 'image'): string {
    const publicId = extractCloudinaryPublicId(fileUrl);
    if (!publicId) return fileUrl; // Fallback if not cloudinary

    const cloudinary = getCloudinary();
    // Expiration time: 1 hour from now
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    return cloudinary.utils.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      resource_type: resourceType,
      expires_at: expiresAt,
    });
  },
};
