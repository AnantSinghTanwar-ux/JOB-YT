import { Request, Response, NextFunction } from 'express';
import { ResumeService } from '../services/resume.service';
import { sendSuccess } from '../utils/response';

export const ResumeController = {
  async getMyResumes(req: Request, res: Response, next: NextFunction) {
    try {
      const resumes = await ResumeService.getUserResumes(req.user!.userId);
      sendSuccess(res, { resumes });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const resume = await ResumeService.getUserResumeById(
        req.user!.userId,
        req.params.id as string,
      );
      sendSuccess(res, { resume });
    } catch (err) {
      next(err);
    }
  },

  async getDefaultResume(req: Request, res: Response, next: NextFunction) {
    try {
      const resume = await ResumeService.getDefaultResume(req.user!.userId);
      sendSuccess(res, { resume });
    } catch (err) {
      next(err);
    }
  },

  async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const resume = await ResumeService.setDefaultResume(
        req.user!.userId,
        req.params.id as string,
      );
      sendSuccess(res, { resume });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ResumeService.deleteResume(req.user!.userId, req.params.id as string);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async scoreATS(req: Request, res: Response, next: NextFunction) {
    try {
      let resumeText = req.body.resumeText as string | undefined;
      const { jobDescription } = req.body;
      const resume_id = req.body.resume_id as string | undefined;
      
      if (req.file && req.file.mimetype === 'application/pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
        const data = await parser.getText();
        await parser.destroy().catch(() => undefined);
        resumeText = data.text;
      }

      if (!resumeText && !req.file && resume_id) {
        resumeText = await ResumeService.getResumeTextForUserResume(req.user!.userId, resume_id);
      }

      if (!resumeText) {
         return res.status(400).json({ success: false, message: 'resumeText or PDF file is required' });
      }

      const result = await ResumeService.scoreATS(resumeText, jobDescription);
      sendSuccess(res, result);
    } catch (err) {
      console.error('Controller ATS Error:', err);
      next(err);
    }
  },

  async generateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const draft = await ResumeService.generateResumeDraft(req.user!.userId);
      sendSuccess(res, { draft }, 'Resume draft generated successfully');
    } catch (err) {
      next(err);
    }
  },

  async getLatex(req: Request, res: Response, next: NextFunction) {
    try {
      const draft = await ResumeService.generateResumeDraft(req.user!.userId);
      const latex = ResumeService.renderResumeLatex(draft);
      const download = req.query.download === 'true';
      if (download) {
        res.setHeader('Content-Type', 'application/x-tex');
        res.setHeader('Content-Disposition', 'attachment; filename="resume.tex"');
      } else {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      }
      res.send(latex);
    } catch (err) {
      next(err);
    }
  },

  async getSecureUrl(req: Request, res: Response, next: NextFunction) {
    try {
      // route is /:userId/resumes/:id/secure-url or similar
      // but the actual authenticated user is req.user
      const requestingUserId = req.user!.userId;
      const role = req.user!.role;
      const resumeId = req.params.id as string;

      const url = await ResumeService.getSecureUrl(requestingUserId, role, resumeId);
      sendSuccess(res, { url });
    } catch (err) {
      next(err);
    }
  },
};

