import { JobModel } from '../models/job.model';
import { badRequest, conflict } from '../utils/appError';
import { ScraperService } from './scraper.service';
import { AiParserService } from './aiParser.service';

export const ExternalJobService = {
  async createExternalJob(userId: string, url: string) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw badRequest('Invalid URL format');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw badRequest('URL must use http or https protocol');
    }

    // Deduplication check
    const isDuplicate = await JobModel.findByExternalUrl(parsedUrl.href);
    if (isDuplicate) {
      throw conflict('A job with this external URL already exists');
    }

    let parsedJob;
    try {
      // Step 1: Scrape text
      console.log(`Scraping external job URL: ${parsedUrl.href}`);
      const rawText = await ScraperService.scrapeText(parsedUrl.href);

      if (!rawText || rawText.length < 50) {
        throw new Error('Extracted text too short or empty');
      }

      // Step 2: Parse using AI
      console.log(`Parsing external job text with AI...`);
      parsedJob = await AiParserService.parseJobText(rawText);

    } catch (error) {
      console.warn(`Ingestion failed for ${parsedUrl.href}:`, error);
      // Graceful fallback if scraping or AI parsing fails
      // We still store the job, just without rich extracted metadata
      parsedJob = {
        title: 'External Job Posting',
        companyName: 'External Company',
        description: 'Please click the apply link to view job details.',
        skills: [],
      };
    }

    // Step 3: Insert mapped job
    return JobModel.createExternal({
      recruiter_id: userId,
      title: parsedJob.title || 'External Job',
      description: parsedJob.description || 'Apply via the external link.',
      companyName: parsedJob.companyName || 'External Company',
      external_url: parsedUrl.href,
    });
  },
};

