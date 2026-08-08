import axios from 'axios';
import {
  DEFAULT_CPU_TIME_LIMIT,
  DEFAULT_MEMORY_LIMIT_KB,
  getLanguageId,
  JUDGE0_API_URL,
  JUDGE0_AUTH_TOKEN,
  JUDGE0_STATUS_ACCEPTED,
} from '../config/judge0.config';
import { Judge0SubmissionResult } from '../types/coding.types';
import { AppError } from '../utils/appError';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (JUDGE0_AUTH_TOKEN) {
  headers['X-Auth-Token'] = JUDGE0_AUTH_TOKEN;
}

export interface ExecuteOptions {
  language: string;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimit?: number;
  memoryLimitKb?: number;
  wait?: boolean;
}

export const Judge0Service = {
  async execute(options: ExecuteOptions): Promise<Judge0SubmissionResult> {
    const languageId = getLanguageId(options.language);

    const payload = {
      source_code: options.sourceCode,
      language_id: languageId,
      stdin: options.stdin ?? null,
      expected_output: options.expectedOutput ?? null,
      cpu_time_limit: options.cpuTimeLimit ?? DEFAULT_CPU_TIME_LIMIT,
      memory_limit: options.memoryLimitKb ?? DEFAULT_MEMORY_LIMIT_KB,
      redirect_stderr_to_stdout: false,
      enable_per_process_and_thread_time_limit: false,
      enable_per_process_and_thread_memory_limit: false,
    };

    const wait = options.wait !== false;
    const url = `${JUDGE0_API_URL}/submissions${wait ? '?wait=true' : ''}`;

    try {
      const { data } = await axios.post<Judge0SubmissionResult>(url, payload, {
        headers,
        timeout: 30000,
      });

      if (!wait && data.token) {
        return this.pollSubmission(data.token);
      }

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Judge0Service] Execution failed:', message);
      throw new AppError(`Code execution service unavailable: ${message}`, 503);
    }
  },

  async pollSubmission(token: string, maxAttempts = 30): Promise<Judge0SubmissionResult> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data } = await axios.get<Judge0SubmissionResult>(
          `${JUDGE0_API_URL}/submissions/${token}`,
          { headers, timeout: 10000 },
        );

        if (data.status && data.status.id >= 3) {
          return data;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Judge0Service] Poll attempt ${i + 1}/${maxAttempts} failed for token ${token}: ${message}`);
        // On the last attempt, propagate
        if (i === maxAttempts - 1) {
          throw new AppError(`Code execution polling failed after ${maxAttempts} attempts: ${message}`, 503);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new AppError('Code execution timed out', 504);
  },

  isAccepted(result: Judge0SubmissionResult): boolean {
    return result.status?.id === JUDGE0_STATUS_ACCEPTED;
  },

  compareOutput(actual: string | null, expected: string): boolean {
    const normalize = (s: string) => s.trim().replace(/\r\n/g, '\n');
    return normalize(actual ?? '') === normalize(expected);
  },

  async healthCheck(): Promise<boolean> {
    try {
      const { status } = await axios.get(`${JUDGE0_API_URL}/about`, {
        headers,
        timeout: 5000,
      });
      return status === 200;
    } catch {
      return false;
    }
  },
};
