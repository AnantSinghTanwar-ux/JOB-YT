import puppeteer from 'puppeteer';
import { ResumeModel } from '../models/resume.model';
import { ResumeVariantModel } from '../models/resumeVariant.model';
import { ResumeService } from './resume.service';
import { StorageService } from './storage.service';
import { parseResume } from '../utils/resumeParser';
import { PromptTemplatesService } from './promptTemplates.service';
import { AIService } from './ai.service';
import pool from '../config/database';

const LOG_PREFIX = '[ResumeTailoringService]';

interface TailorPatch {
  path: string;
  action: 'replace' | 'append' | 'reorder' | 'add_skill';
  original: string | null;
  value: any;
  reason: string;
}

interface TailorLLMResult {
  changes?: TailorPatch[];
  strategy_notes?: string;
}

interface TargetPlanLLMResult {
  target_skills: Array<{ skill: string, reason: string }>;
  strategy_notes: string;
}

function applyPatches(resumeJson: any, changes: TailorPatch[]) {
  const changeLog: string[] = [];
  
  for (const patch of changes) {
    try {
      if (patch.path === 'summary') {
        resumeJson.summary = patch.value;
        changeLog.push(`Summary: ${patch.reason}`);
      } else if (patch.path === 'skills') {
        if (!resumeJson.skills) resumeJson.skills = [];
        if (patch.action === 'add_skill' && typeof patch.value === 'string') {
          if (!resumeJson.skills.includes(patch.value)) {
            resumeJson.skills.push(patch.value);
            changeLog.push(`Added skill ${patch.value}: ${patch.reason}`);
          }
        }
      } else if (patch.path.startsWith('experience[')) {
        const match = patch.path.match(/experience\[(\d+)\]\.(\w+)(?:\[(\d+)\])?/);
        if (match) {
          const expIdx = parseInt(match[1]);
          const field = match[2]; // usually "description" or "bullets"
          const exp = resumeJson.experience[expIdx];
          if (exp) {
            if (!exp[field]) exp[field] = [];
            else if (typeof exp[field] === 'string') exp[field] = [exp[field]];

            if (patch.action === 'replace' && match[3] !== undefined) {
              const bIdx = parseInt(match[3]);
              if (exp[field][bIdx]) {
                exp[field][bIdx] = patch.value;
                changeLog.push(`Experience ${expIdx} update: ${patch.reason}`);
              }
            } else if (patch.action === 'append') {
              exp[field].push(patch.value);
              changeLog.push(`Experience ${expIdx} added detail: ${patch.reason}`);
            }
          }
        }
      } else if (patch.path.startsWith('education[')) {
        const match = patch.path.match(/education\[(\d+)\]\.(\w+)/);
        if (match) {
          const eduIdx = parseInt(match[1]);
          const field = match[2];
          const edu = resumeJson.education[eduIdx];
          if (edu) {
             edu[field] = patch.value;
             changeLog.push(`Education ${eduIdx} update: ${patch.reason}`);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to apply patch:', patch);
    }
  }
  return changeLog;
}

function renderResumeHtml(resumeJson: any): string {
  const expHtml = (resumeJson.experience || [])
    .map(
      (e: any) => `
      <div style="margin-bottom:12px">
        <strong>${e.role || ''}</strong> — ${e.company || ''} <em>${e.dates || ''}</em>
        <ul>${(e.bullets || e.description || []).map((b: string) => `<li>${b}</li>`).join('')}</ul>
      </div>`,
    )
    .join('');

  const eduHtml = (resumeJson.education || [])
    .map((e: any) => `<div>${e.degree || ''} — ${e.institution || ''} (${e.dates || ''})</div>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #0b1120; font-size: 12px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #ccc; }
  </style></head><body>
    <h1>${resumeJson.name || 'Candidate'}</h1>
    <p>${resumeJson.summary || resumeJson.bio || ''}</p>
    <h2>Skills</h2>
    <p>${(resumeJson.skills || []).join(' · ')}</p>
    <h2>Experience</h2>
    ${expHtml}
    <h2>Education</h2>
    ${eduHtml}
  </body></html>`;
}

async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export const ResumeTailoringService = {
  async tailorForJob(
    userId: string,
    jobId: string,
    baseResumeId: string,
    queueItemId?: string,
  ) {
    const resume = await ResumeModel.findByUserAndId(userId, baseResumeId);
    if (!resume) {
      throw Object.assign(new Error('Base resume not found'), { statusCode: 404 });
    }

    const { rows: jobRows } = await pool.query(
      'SELECT title, description, skills FROM jobs WHERE id = $1',
      [jobId],
    );
    if (!jobRows.length) {
      throw Object.assign(new Error('Job not found'), { statusCode: 404 });
    }
    const job = jobRows[0];

    const versionCount = await ResumeVariantModel.countForJob(userId, jobId);
    const versionLabel = String.fromCharCode(65 + Math.min(versionCount, 25));

    // --- Attempt AI tailoring and PDF generation ---
    let snapshotUrl: string = resume.file_url; // Default: use original resume
    let changeLog: string[] = [];
    let tailoringSucceeded = false;

    try {
      const buffer = await ResumeService.loadResumeFileBuffer(resume.file_url);
      const parsed = await parseResume(buffer, {
        filename: resume.file_name,
        mimeType: resume.mime_type || undefined,
      });

      const resumeJson = {
        name: parsed.name,
        summary: '',
        skills: Array.isArray(parsed.skills) ? [...parsed.skills] : [],
        experience: Array.isArray(parsed.experience) ? JSON.parse(JSON.stringify(parsed.experience)) : [],
        education: Array.isArray(parsed.education) ? JSON.parse(JSON.stringify(parsed.education)) : [],
      };
      
      const jobSkills = (Array.isArray(job.skills) ? job.skills : []).join(', ');
      const jobDescriptionStr = String(job.description || '').slice(0, 6000);

      // STEP 1: Skill Target Plan
      const targetPlanPrompt = await PromptTemplatesService.renderTemplate('skill_target_plan', {
        existingSkills: resumeJson.skills.join(', '),
        jobKeywords: jobSkills,
        jobDescription: jobDescriptionStr,
        originalResume: JSON.stringify(resumeJson)
      });
      
      const targetPlanResult = (await AIService.generateJSON(targetPlanPrompt)) as TargetPlanLLMResult | null;
      const skillTargets = targetPlanResult?.target_skills ? targetPlanResult.target_skills.map(s => s.skill).join(', ') : '';

      // Fetch user's tailoring aggressiveness (defaults to keywords)
      const { rows: prefRows } = await pool.query('SELECT tailoring_mode FROM auto_apply_preferences WHERE user_id = $1', [userId]);
      const mode = prefRows[0]?.tailoring_mode || 'keywords';
      
      let strategyInstruction = "Weave in relevant keywords where evidence already exists. You may rephrase bullets but do not add new ones.";
      if (mode === 'nudge') strategyInstruction = "Make minimal edits. Only rephrase where there is a clear match. Do not add new bullet points.";
      else if (mode === 'full') strategyInstruction = "Make targeted adjustments. You may rephrase bullets, add verified JD skills, and add new bullets that elaborate on existing work, but do not invent new responsibilities.";

      // STEP 2: Diff-based patching
      const diffPrompt = await PromptTemplatesService.renderTemplate('resume_tailoring', {
        strategyInstruction,
        jobKeywords: jobSkills,
        skillTargets,
        jobDescription: jobDescriptionStr,
        originalResume: JSON.stringify(resumeJson),
      });

      const llmResult = (await AIService.generateJSON(diffPrompt)) as TailorLLMResult | null;

      if (llmResult?.changes && llmResult.changes.length > 0) {
        changeLog = applyPatches(resumeJson, llmResult.changes);

        if (changeLog.length > 0) {
          const html = renderResumeHtml(resumeJson);
          const pdfBuffer = await htmlToPdfBuffer(html);

          const file = {
            buffer: pdfBuffer,
            originalname: `tailored-${jobId}-${versionLabel}.pdf`,
            mimetype: 'application/pdf',
            size: pdfBuffer.length,
          } as Express.Multer.File;

          const { url } = await StorageService.uploadResume(file);
          snapshotUrl = url;
          tailoringSucceeded = true;
        } else {
          console.log(`${LOG_PREFIX} Patches generated but none were successfully applied.`);
        }
      } else {
         console.log(`${LOG_PREFIX} No changes were generated by LLM for job ${jobId}`);
      }
    } catch (tailorErr) {
      console.warn(
        `${LOG_PREFIX} Tailoring step failed for job ${jobId} — falling back to original resume:`,
        tailorErr instanceof Error ? tailorErr.message : tailorErr,
      );
    }

    const variant = await ResumeVariantModel.create({
      user_id: userId,
      job_id: jobId,
      base_resume_id: baseResumeId,
      version_label: versionLabel,
      snapshot_url: snapshotUrl,
      change_log: tailoringSucceeded ? changeLog : ['[Used original resume — tailoring unavailable]'],
      fabricated_risk: false,
      queue_item_id: queueItemId ?? null,
    });

    console.log(`${LOG_PREFIX} Created variant ${variant.id} for job ${jobId} (tailored=${tailoringSucceeded})`);
    return { variant, snapshotUrl };
  },
};
