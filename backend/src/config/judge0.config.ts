import { CodingLanguage } from '../types/coding.types';

export const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
export const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || '';

if (!JUDGE0_AUTH_TOKEN) {
  console.warn('[Judge0Config] JUDGE0_AUTH_TOKEN is not set — requests will be sent without authentication. This is fine for local Judge0 instances but will fail against authenticated deployments.');
}

export const LANGUAGE_IDS: Record<CodingLanguage, number> = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
};

export const SUPPORTED_LANGUAGES: CodingLanguage[] = ['python', 'javascript', 'java', 'cpp'];

export const DEFAULT_CPU_TIME_LIMIT = 5;
/** 128 MB in KB — matches the Prisma schema default and Judge0 defaults */
export const DEFAULT_MEMORY_LIMIT_KB = 128_000;

export const JUDGE0_STATUS_ACCEPTED = 3;

export function getLanguageId(language: string): number {
  const id = LANGUAGE_IDS[language as CodingLanguage];
  if (!id) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return id;
}
