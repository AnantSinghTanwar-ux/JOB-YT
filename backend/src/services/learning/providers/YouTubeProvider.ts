import { CourseProvider } from './CourseProvider';
import { CourseMetadata } from '../types';
import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class YouTubeProvider implements CourseProvider {
  private API_KEY = process.env.YOUTUBE_API_KEY || '';

  async searchCourses(query: string, maxResults: number = 3): Promise<CourseMetadata[]> {
    if (!this.API_KEY) {
      logger.warn('YouTube API key is missing. Returning mock data or empty array.');
      // Fallback for completely free/offline testing if no API key is set
      return [
        {
          provider: 'youtube',
          externalId: `mock-yt-${Date.now()}`,
          title: `${query} Crash Course for Beginners`,
          url: `https://youtube.com/results?search_query=${encodeURIComponent(query)}`,
          skillTags: [query],
          language: 'en'
        }
      ];
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' course tutorial')}&type=video&maxResults=${maxResults}&key=${this.API_KEY}`;
      const response = await axios.get(url);
      
      const items = response.data.items || [];
      return items.map((item: any) => ({
        provider: 'youtube',
        externalId: item.id.videoId,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        instructor: item.snippet.channelTitle,
        skillTags: [query],
        language: 'en'
      }));
    } catch (error: any) {
      logger.error(`YouTube scraping failed for query ${query}: ${error.message}`);
      return [];
    }
  }

  async getCourseDetails(courseUrlOrId: string): Promise<CourseMetadata | null> {
    // In a real scenario, this would use youtube.videos.list API
    return null;
  }
}
