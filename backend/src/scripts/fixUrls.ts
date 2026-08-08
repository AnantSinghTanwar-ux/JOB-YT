import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../.env') });

import pool from '../config/database';
import { normalizeUrl } from '../utils/url';

async function migrateUrls() {
  console.log('Starting URL migration...');

  try {
    // 1. Recruiter Profiles
    const { rows: recruiters } = await pool.query('SELECT user_id, website, logo_url FROM recruiter_profiles');
    let recruiterUpdates = 0;
    for (const rec of recruiters) {
      const normalizedWebsite = normalizeUrl(rec.website);
      const normalizedLogo = normalizeUrl(rec.logo_url);
      
      if (normalizedWebsite !== rec.website || normalizedLogo !== rec.logo_url) {
        await pool.query('UPDATE recruiter_profiles SET website = $1, logo_url = $2 WHERE user_id = $3', [
          normalizedWebsite,
          normalizedLogo,
          rec.user_id
        ]);
        recruiterUpdates++;
      }
    }
    console.log(`Updated ${recruiterUpdates} recruiter profiles.`);

    // 2. Applicant Profiles
    const { rows: applicants } = await pool.query('SELECT user_id, portfolio_url, github_url, linkedin_url, photo_url FROM applicant_profiles');
    let applicantUpdates = 0;
    for (const app of applicants) {
      const normalizedPortfolio = normalizeUrl(app.portfolio_url);
      const normalizedGithub = normalizeUrl(app.github_url);
      const normalizedLinkedin = normalizeUrl(app.linkedin_url);
      const normalizedPhoto = normalizeUrl(app.photo_url);

      if (
        normalizedPortfolio !== app.portfolio_url ||
        normalizedGithub !== app.github_url ||
        normalizedLinkedin !== app.linkedin_url ||
        normalizedPhoto !== app.photo_url
      ) {
        await pool.query(
          'UPDATE applicant_profiles SET portfolio_url = $1, github_url = $2, linkedin_url = $3, photo_url = $4 WHERE user_id = $5',
          [normalizedPortfolio, normalizedGithub, normalizedLinkedin, normalizedPhoto, app.user_id]
        );
        applicantUpdates++;
      }
    }
    console.log(`Updated ${applicantUpdates} applicant profiles.`);

    // 3. Jobs
    const { rows: jobs } = await pool.query('SELECT id, company_website, company_logo FROM jobs');
    let jobUpdates = 0;
    for (const job of jobs) {
      const normalizedCompanyWebsite = normalizeUrl(job.company_website);
      const normalizedCompanyLogo = normalizeUrl(job.company_logo);

      if (normalizedCompanyWebsite !== job.company_website || normalizedCompanyLogo !== job.company_logo) {
        await pool.query('UPDATE jobs SET company_website = $1, company_logo = $2 WHERE id = $3', [
          normalizedCompanyWebsite,
          normalizedCompanyLogo,
          job.id
        ]);
        jobUpdates++;
      }
    }
    console.log(`Updated ${jobUpdates} jobs.`);

    console.log('URL migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrateUrls().catch(console.error);
