import axios from 'axios';
import { JobModel } from '../models/job.model';
import { ApplicationModel } from '../models/application.model';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export const ShortlistReportService = {
  async generateReport(jobId: string, recruiterId: string): Promise<any> {
    // 1. Fetch and validate job listing
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job listing not found', 'JOB_NOT_FOUND');
    }

    if (job.recruiter_id !== recruiterId) {
      throw new ForbiddenError(
        'You are not authorized to view this shortlist report',
        'NOT_THE_RECRUITER',
      );
    }

    // 2. Fetch shortlisted candidates
    const candidates = await ApplicationModel.findShortlistedByJob(jobId);

    // If no candidates are shortlisted, return report with empty list and simple summary
    if (candidates.length === 0) {
      return {
        jobTitle: job.title,
        candidates: [],
        aiSummary: 'No candidates have been shortlisted for this role yet. Shortlist candidates to generate an AI executive summary.',
      };
    }

    // 3. Format candidates list for the AI prompt
    const candidatesDetails = candidates
      .map((c, i) => {
        const skillsList = Array.isArray(c.skills) && c.skills.length > 0 ? c.skills.join(', ') : 'None listed';
        const displayScore = c.override_score !== null && c.override_score !== undefined ? c.override_score : (c.ats_score || 0);
        const overrideText = c.override_score !== null && c.override_score !== undefined ? ' (Employer Override)' : '';
        return `${i + 1}. Name: ${c.name || 'Applicant'} | Match Score: ${displayScore}%${overrideText} | Key Skills: ${skillsList}`;//
      })
      .join('\n');

    // 4. Construct prompt
    const jobSkillsText = Array.isArray(job.skills) && job.skills.length > 0 ? job.skills.join(', ') : 'Not specified';
    const systemPrompt = `You are a staff talent acquisition specialist and recruiter assistant.
Analyze the following cohort of shortlisted candidates for the job: "${job.title}".

JOB INFO:
- Required Skills: ${jobSkillsText}
- Description: ${job.description.slice(0, 800)}

SHORTLISTED CANDIDATES (Ranked by ATS Match Score):
${candidatesDetails}

Please write an executive report summary (2-3 short, professional paragraphs) analyzing this cohort's strengths, experience depth, and common traits. Mention which candidate(s) seem to be the strongest overall match. Speak directly to the recruiter. Keep the summary professional, clear, and action-oriented.`;

    // 5. LLM Fallback chain: Claude API -> Groq API -> Ollama API
    const claudeApiKey = process.env.CLAUDE_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const ollamaApiKey = process.env.OLLAMA_API_KEY;

    let aiSummary = '';

    // Provider 1: Claude API
    if (claudeApiKey && claudeApiKey.trim()) {
      try {
        console.log('[Claude API] Generating shortlist report summary...');
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            messages: [{ role: 'user', content: systemPrompt }],
          },
          {
            headers: {
              'x-api-key': claudeApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            timeout: 15000,
          }
        );
        const text = response.data?.content?.[0]?.text;
        if (text) aiSummary = text.trim();
      } catch (err: any) {
        console.error('[Claude API] Failed:', err.message);
      }
    }

    // Provider 2: Groq API
    if (!aiSummary && groqApiKey && groqApiKey.trim()) {
      try {
        console.log('[Groq API] Generating shortlist report summary...');
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.5,
            max_tokens: 500,
          },
          {
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        const text = response.data?.choices?.[0]?.message?.content;
        if (text) aiSummary = text.trim();
      } catch (err: any) {
        console.error('[Groq API] Failed:', err.message);
      }
    }

    // Provider 3: Ollama API
    if (!aiSummary && ollamaApiKey && ollamaApiKey.trim()) {
      try {
        console.log('[Ollama API] Generating shortlist report summary...');
        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
        const response = await axios.post(
          ollamaUrl,
          {
            model: process.env.OLLAMA_MODEL || 'llama3',
            messages: [{ role: 'user', content: systemPrompt }],
            stream: false,
          },
          {
            headers: {
              'Authorization': `Bearer ${ollamaApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        const text = response.data?.message?.content || response.data?.choices?.[0]?.message?.content;
        if (text) aiSummary = text.trim();
      } catch (err: any) {
        console.error('[Ollama API] Failed:', err.message);
      }
    }

    if (!aiSummary) {
      console.warn('[AI Services] All shortlist report providers failed or are unconfigured.');
      aiSummary = 'AI summary could not be generated at this time because all LLM services are offline or unconfigured. Please review the ranked candidate list below manually.';
    }

    // 6. Return compiled report
    return {
      jobTitle: job.title,
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.name || 'Applicant',
        email: c.email,
        matchScore: c.override_score !== null && c.override_score !== undefined ? c.override_score : c.ats_score,
        override_score: c.override_score,
        skills: c.skills,
      })),
      aiSummary,
    };
  },
};
