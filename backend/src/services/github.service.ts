// src/services/github.service.ts
import axios from 'axios';
import logger from '../config/logger';
import prisma from '../config/prisma';

/**
 * Service responsible for synchronizing a user's GitHub repositories
 * into the local database. It is invoked after a successful GitHub
 * OAuth login.
 */
export class GithubService {
  /**
   * Fetches the authenticated user's public and private repositories from
   * GitHub and upserts them into the `github_repos` table.
   *
   * @param userId - UUID of the user in our system
   * @param accessToken - OAuth access token received from GitHub
   */
  static async syncUserRepos(userId: string, accessToken: string): Promise<void> {
    if (!accessToken) {
      logger.warn('GitHub sync aborted: missing access token');
      return;
    }

    try {
      const perPage = 100;
      let page = 1;
      let repos: any[] = [];
      // Paginate through all repos (GitHub caps at 100 per page)
      while (true) {
        const response = await axios.get('https://api.github.com/user/repos', {
          params: { per_page: perPage, page },
          headers: { Authorization: `token ${accessToken}` },
        });
        const data = response.data;
        if (!Array.isArray(data) || data.length === 0) break;
        repos = repos.concat(data);
        if (data.length < perPage) break; // last page
        page += 1;
      }

      logger.info(`Fetched ${repos.length} GitHub repos for user ${userId}`);

      for (const repo of repos) {
        await prisma.github_repos.upsert({
          where: { github_id: BigInt(repo.id) },
          create: {
            github_id: BigInt(repo.id),
            user_id: userId,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || null,
            html_url: repo.html_url,
            language: repo.language || null,
            stargazers_count: repo.stargazers_count || 0,
            is_private: Boolean(repo.private),
          },
          update: {
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || null,
            html_url: repo.html_url,
            language: repo.language || null,
            stargazers_count: repo.stargazers_count || 0,
            is_private: Boolean(repo.private),
            updated_at: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error('Failed to sync GitHub repos', error);
      // Swallow error to avoid breaking login flow
    }
  }
}
