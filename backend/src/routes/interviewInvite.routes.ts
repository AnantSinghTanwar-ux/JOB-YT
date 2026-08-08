import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { InterviewInviteService } from '../services/interviewInvite.service';

const router = Router();

// Create invite
router.post('/jobs/:jobId/applications/:applicationId/interview-invite', authenticate, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const recruiterId = req.user!.userId;
    const applicationId = req.params.applicationId as string;
    const { scheduledAt, locationOrLink, notes } = req.body;

    const invite = await InterviewInviteService.createInvite(recruiterId, applicationId, {
      scheduledAt: new Date(scheduledAt),
      locationOrLink,
      notes
    });

    res.status(201).json(invite);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// List invites
router.get('/jobs/:jobId/applications/:applicationId/interview-invite', authenticate, async (req, res) => {
  try {
    // Ideally check if recruiter owns the job, but for simplicity:
    const applicationId = req.params.applicationId as string;
    const invites = await InterviewInviteService.listInvites(applicationId);
    res.json(invites);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel invite
router.patch('/interview-invite/:inviteId/cancel', authenticate, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const recruiterId = req.user!.userId;
    const inviteId = req.params.inviteId as string;

    const invite = await InterviewInviteService.cancelInvite(recruiterId, inviteId);
    res.json(invite);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
