import { v2 as cloudinary } from 'cloudinary';

let configured = false;

export const getCloudinary = () => {
  if (!configured) {
    const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

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
