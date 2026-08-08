import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../../.env') });

import pool from '../config/database';
import { getCloudinary } from '../config/cloudinary';

const extractCloudinaryPublicId = (url: string): string | null => {
  if (!url.includes('res.cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

async function migrateResumes() {
  console.log('Starting migration to secure Cloudinary resumes...');
  const cloudinary = getCloudinary();

  try {
    const { rows: resumes } = await pool.query('SELECT id, file_url, file_name FROM resumes');
    console.log(`Found ${resumes.length} resumes in database.`);

    for (const resume of resumes) {
      const publicId = extractCloudinaryPublicId(resume.file_url);
      if (!publicId) {
        console.log(`Skipping non-Cloudinary resume: ${resume.id}`);
        continue;
      }

      try {
        console.log(`Securing resume: ${resume.id} (${publicId})`);
        
        // This renames the file to itself but changes the access type to 'authenticated'
        await cloudinary.uploader.rename(publicId, publicId, {
          to_type: 'authenticated',
          type: 'upload', // From type
          overwrite: true
        });
        
        console.log(`Successfully secured resume: ${resume.id}`);
      } catch (err: any) {
        // If it's already authenticated, Cloudinary might throw an error saying it's not found under 'upload' type
        if (err.http_code === 404) {
           console.log(`Resume ${resume.id} might already be authenticated or does not exist.`);
        } else {
           console.error(`Failed to secure resume: ${resume.id}`, err.message);
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrateResumes().catch(console.error);
