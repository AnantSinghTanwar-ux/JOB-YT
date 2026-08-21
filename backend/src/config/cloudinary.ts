import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function normalizeEnv(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Railway/Raw editor copy-paste sometimes keeps wrapping quotes.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    return unquoted || undefined;
  }

  return trimmed;
}

export const getCloudinary = () => {
  if (!configured) {
    const cloudinaryUrl = normalizeEnv(process.env.CLOUDINARY_URL);
    const cloudName = normalizeEnv(process.env.CLOUDINARY_CLOUD_NAME);
    const apiKey = normalizeEnv(process.env.CLOUDINARY_API_KEY);
    const apiSecret = normalizeEnv(process.env.CLOUDINARY_API_SECRET);

    if (cloudinaryUrl) {
      cloudinary.config({
        cloudinary_url: cloudinaryUrl,
        secure: true,
      });
      configured = true;
      return cloudinary;
    }

    if (!cloudName || !apiKey || !apiSecret) {
      throw Object.assign(new Error('Cloudinary environment variables are not configured'), {
        statusCode: 500,
        code: 'CLOUDINARY_CONFIG_MISSING',
        required: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
      });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    configured = true;
  }

  return cloudinary;
};
