import { CourseMetadata } from '../types';

/**
 * Interface for retrieving courses dynamically from external platforms
 * e.g., YouTube, Coursera, Udemy.
 */
export interface CourseProvider {
  /**
   * Search for courses matching a given skill or keyword
   */
  searchCourses(query: string, maxResults?: number): Promise<CourseMetadata[]>;

  /**
   * Fetch specific metadata for a given course ID/URL
   */
  getCourseDetails(courseUrlOrId: string): Promise<CourseMetadata | null>;
}
