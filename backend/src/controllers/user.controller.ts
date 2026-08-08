import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import pool from '../config/database';
import { DeviceTokenModel } from '../models/deviceToken.model';
import { OAuthService } from '../services/oauth.service';
import { GithubService } from '../services/github.service';

export const UserController = {
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.getProfile(req.user!.userId, req.user!.role);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows } = await pool.query(
        'SELECT email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled FROM users WHERE id = $1',
        [req.user!.userId]
      );
      sendSuccess(res, rows[0]);
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled } = req.body;
      const { rows } = await pool.query(
        `UPDATE users 
         SET email_alerts_enabled = COALESCE($1, email_alerts_enabled),
             whatsapp_alerts_enabled = COALESCE($2, whatsapp_alerts_enabled),
             push_alerts_enabled = COALESCE($3, push_alerts_enabled)
         WHERE id = $4 RETURNING email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled`,
        [email_alerts_enabled, whatsapp_alerts_enabled, push_alerts_enabled, req.user!.userId]
      );
      sendSuccess(res, rows[0], 'Preferences updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async registerDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, platform } = req.body;
      const deviceToken = await DeviceTokenModel.register(req.user!.userId, token, platform);
      
      // Automatically enable push alerts when registering device token successfully
      await pool.query(
        'UPDATE users SET push_alerts_enabled = TRUE WHERE id = $1',
        [req.user!.userId]
      );

      sendSuccess(res, deviceToken, 'Device token registered successfully');
    } catch (err) {
      next(err);
    }
  },

  async removeDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await DeviceTokenModel.deleteToken(token);
      sendSuccess(res, null, 'Device token removed successfully');
    } catch (err) {
      next(err);
    }
  },


  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, userId } = req.user!;
      const data =
        role === 'applicant'
          ? await UserService.updateApplicantProfile(userId, req.body)
          : await UserService.updateRecruiterProfile(userId, req.body);
      sendSuccess(res, data, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },

  async uploadResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const data = await UserService.uploadResume(req.user!.userId, req.file);
      sendSuccess(res, data, 'Resume uploaded');
    } catch (err) {
      next(err);
    }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const data = await UserService.uploadPhoto(req.user!.userId, req.user!.role, req.file);
      sendSuccess(res, data, 'Photo uploaded');
    } catch (err) {
      next(err);
    }
  },

  async getSavedJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await UserService.getSavedJobs(req.user!.userId);
      sendSuccess(res, jobs);
    } catch (err) {
      next(err);
    }
  },

  async saveJob(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.saveJob(req.user!.userId, req.params.jobId as string);
      sendSuccess(res, null, 'Job saved');
    } catch (err) {
      next(err);
    }
  },

  async unsaveJob(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.unsaveJob(req.user!.userId, req.params.jobId as string);
      sendSuccess(res, null, 'Job removed from saved list');
    } catch (err) {
      next(err);
    }
  },

  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.getPublicProfile(req.params.userId as string, req.user);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async parseResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const { parseResume } = await import('../utils/resumeParser');
       const parsed = await parseResume(req.file.buffer, {
         filename: req.file.originalname,
         mimeType: req.file.mimetype,
       });
      await UserService.syncParsedResumeToProfile(req.user!.userId, parsed);
      sendSuccess(res, parsed, 'Resume parsed successfully');
    } catch (err) {
      next(err);
    }
  },

  async importLinkedInProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const { code, state } = req.body;

      if (!code) {
        res.status(400).json({ success: false, message: 'Authorization code is required' });
        return;
      }

      // Verify server is configured for LinkedIn OAuth
      const hasLinkedInSecrets = process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET;
      if (!hasLinkedInSecrets || process.env.LINKEDIN_CLIENT_ID === 'your_linkedin_client_id') {
        res.status(400).json({
          success: false,
          message: 'LinkedIn OAuth is not configured on the server. Please define LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the backend environment.',
        });
        return;
      }

      console.log(`[UserController.importLinkedInProfile] Executing production import. Code: ${code}`);
      const oauthUser = await OAuthService.verifyLinkedinToken(code);

      // Map production userinfo properties to candidate profile
      const importedData = {
        name: oauthUser.name,
        photo_url: oauthUser.avatar,
        linkedin_url: oauthUser.email ? `https://www.linkedin.com/in/${oauthUser.providerId}` : null,
        bio: 'Imported from LinkedIn profile.',
      };

      // Construct a partial update object, only updating fields if they are defined
      const updateData: any = {};
      if (importedData.name) updateData.name = importedData.name;
      if (importedData.photo_url) updateData.photo_url = importedData.photo_url;
      if (importedData.linkedin_url) updateData.linkedin_url = importedData.linkedin_url;
      if (importedData.bio) updateData.bio = importedData.bio;

      // Update candidate profile fields in DB without wiping out existing details
      const result = await UserService.updateApplicantProfile(userId, updateData);

      sendSuccess(res, result, 'LinkedIn profile synchronized successfully');
    } catch (err) {
      next(err);
    }
  },

  async importGithubProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ success: false, message: 'Authorization code is required' });
        return;
      }

      const hasGithubSecrets = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET;
      if (!hasGithubSecrets || process.env.GITHUB_CLIENT_ID === 'your_github_client_id') {
        res.status(400).json({
          success: false,
          message: 'GitHub OAuth is not configured on the server. Please define GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment.',
        });
        return;
      }

      console.log(`[UserController.importGithubProfile] Exchange token and get identity. Code: ${code}`);
      const { accessToken, identity } = await OAuthService.getGithubAccessTokenAndIdentity(code);

      // Map userinfo properties to candidate profile
      const importedData = {
        name: identity.name,
        photo_url: identity.avatar,
        bio: 'Imported from GitHub profile.',
      };

      const updateData: any = {};
      if (importedData.name) updateData.name = importedData.name;
      if (importedData.photo_url) updateData.photo_url = importedData.photo_url;
      if (importedData.bio) updateData.bio = importedData.bio;

      // Update candidate profile in DB
      const result = await UserService.updateApplicantProfile(userId, updateData);

      // Trigger repository sync in background
      GithubService.syncUserRepos(userId, accessToken).catch((err) => {
        console.error('GitHub repo sync background job error:', err);
      });

      sendSuccess(res, result, 'GitHub profile and repositories synchronized successfully');
    } catch (err) {
      next(err);
    }
  },
};
