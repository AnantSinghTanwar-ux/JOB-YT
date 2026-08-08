import { Server as SocketServer, Socket } from 'socket.io';
import { InterviewService } from './interview.service';
import { InterviewModel } from '../models/interview.model';

interface AuthSocket extends Socket {
  user?: {
    userId: string;
    role: string;
    email: string | null;
  };
  activeInterviewRooms?: Set<string>;
}

export const registerLiveInterviewHandlers = (socket: AuthSocket, io: SocketServer) => {
  const user = socket.user;
  if (!user) return;

  socket.activeInterviewRooms = socket.activeInterviewRooms || new Set();

  // 1. Join live interview session
  socket.on('join_interview_session', async (payload: { interviewId: string }) => {
    try {
      const { interviewId } = payload;
      if (!interviewId) return;

      // Fetch the interview to verify participation
      const interview = await InterviewModel.getById(interviewId);
      if (!interview) {
        socket.emit('error', { message: 'Interview not found' });
        return;
      }

      // Check if candidate, recruiter, or admin
      const isCandidate = interview.candidate_id === user.userId;
      const isInterviewer = interview.interviewer_id === user.userId;
      const isAdmin = user.role === 'admin';

      if (!isCandidate && !isInterviewer && !isAdmin) {
        socket.emit('error', { message: 'Unauthorized access to this live interview room' });
        return;
      }

      // Join the socket room
      socket.join(`interview:${interviewId}`);
      socket.activeInterviewRooms?.add(interviewId);

      // Initialize session in-memory state
      const session = InterviewService.initializeLiveSession(
        interviewId,
        interview.code_content || '',
        interview.code_language || 'javascript',
        interview.notes || '',
      );

      // Register candidate or interviewer in session
      InterviewService.addParticipant(interviewId, user.userId);

      // Return current session snapshot
      socket.emit('interview_session_state', {
        code: session.code,
        language: session.language,
        notes: (user.role === 'recruiter' || user.role === 'admin') ? session.notes : undefined,
        participants: Array.from(session.participants),
      });

      // Broadcast event to room
      socket.to(`interview:${interviewId}`).emit('user_joined_interview', {
        userId: user.userId,
        role: user.role,
      });

      console.log(`[Socket] User ${user.userId} joined interview ${interviewId}`);
    } catch (err: any) {
      console.error('[Socket] Error in join_interview_session:', err);
      socket.emit('error', { message: 'Failed to join live session' });
    }
  });

  // 2. Leave live interview session
  socket.on('leave_interview_session', (payload: { interviewId: string }) => {
    const { interviewId } = payload;
    if (!interviewId) return;

    socket.leave(`interview:${interviewId}`);
    socket.activeInterviewRooms?.delete(interviewId);

    InterviewService.removeParticipant(interviewId, user.userId);

    socket.to(`interview:${interviewId}`).emit('user_left_interview', {
      userId: user.userId,
      role: user.role,
    });

    console.log(`[Socket] User ${user.userId} left interview ${interviewId}`);
  });

  // 3. Code Change Synchronization
  socket.on('code_change', (payload: { interviewId: string; code: string }) => {
    const { interviewId, code } = payload;
    if (!interviewId) return;

    // Verify participation
    if (!socket.activeInterviewRooms?.has(interviewId)) return;

    InterviewService.updateLiveCode(interviewId, code);

    // Broadcast code updates to other users in the room
    socket.to(`interview:${interviewId}`).emit('code_update', { code });
  });

  // 4. Code Language Synchronization
  socket.on('language_change', (payload: { interviewId: string; language: string }) => {
    const { interviewId, language } = payload;
    if (!interviewId) return;

    // Verify participation
    if (!socket.activeInterviewRooms?.has(interviewId)) return;

    InterviewService.updateLiveLanguage(interviewId, language);

    // Broadcast language updates to other users
    socket.to(`interview:${interviewId}`).emit('language_update', { language });
  });

  // 5. Cursor Location Synchronization
  socket.on('cursor_move', (payload: { interviewId: string; cursor: { line: number; ch: number } }) => {
    const { interviewId, cursor } = payload;
    if (!interviewId) return;

    // Verify participation
    if (!socket.activeInterviewRooms?.has(interviewId)) return;

    // Broadcast cursor position updates to other users
    socket.to(`interview:${interviewId}`).emit('cursor_update', {
      userId: user.userId,
      cursor,
    });
  });

  // 6. WebRTC Audio/Video Signal Routing
  socket.on('webrtc_signal', (payload: { interviewId: string; signal: any }) => {
    const { interviewId, signal } = payload;
    if (!interviewId) return;

    // Route SDP offer/answer or ICE candidate packet to peer
    socket.to(`interview:${interviewId}`).emit('webrtc_signal', {
      senderId: user.userId,
      signal,
    });
  });

  // 7. Live Session Chat
  socket.on('chat_message', (payload: { interviewId: string; message: string }) => {
    const { interviewId, message } = payload;
    if (!interviewId || !message) return;

    // Verify participation
    if (!socket.activeInterviewRooms?.has(interviewId)) return;

    // Broadcast chat packet to all participants (including sender)
    io.to(`interview:${interviewId}`).emit('chat_message', {
      senderId: user.userId,
      senderRole: user.role,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // 8. Request Dynamic Follow-up Question
  socket.on('request_followup_question', async (payload: { interviewId: string; code: string; language: string }) => {
    const { interviewId, code, language } = payload;
    if (!interviewId) return;

    if (!socket.activeInterviewRooms?.has(interviewId)) return;

    if (user.role !== 'recruiter' && user.role !== 'admin') {
      socket.emit('error', { message: 'Only recruiters can request follow-up questions' });
      return;
    }

    try {
      const question = "Can you explain the time and space complexity of your solution?";
      if (question) {
        io.to(`interview:${interviewId}`).emit('followup_question', {
          question,
          timestamp: new Date().toISOString(),
        });
      } else {
        socket.emit('error', { message: 'Could not generate follow-up question. Check AI configuration.' });
      }
    } catch (err: any) {
      console.error('[Socket] generateFollowupQuestion failed:', err);
      socket.emit('error', { message: 'Failed to generate follow-up question' });
    }
  });

  // Proctoring Violations Logs & Alert routing
  socket.on('proctoring_violation', async (payload: { interviewId: string; eventType: 'tab_switch' | 'window_blur' | 'face_absent' | 'multiple_faces'; timestamp: string }) => {
    try {
      const { interviewId, eventType, timestamp } = payload;
      if (!interviewId || !eventType || !timestamp) return;

      // Verify participation
      if (!socket.activeInterviewRooms?.has(interviewId)) return;

      console.log(`[Socket] Proctoring alert in interview room ${interviewId}: ${user.userId} triggered ${eventType}`);

      // Log it in DB via service
      await InterviewService.logProctoringViolation(interviewId, eventType, timestamp);

      // Broadcast to other users in the room (like recruiter)
      socket.to(`interview:${interviewId}`).emit('proctoring_alert', {
        userId: user.userId,
        eventType,
        timestamp,
      });
    } catch (err: any) {
      console.error('[Socket] Failed to process proctoring_violation:', err);
    }
  });

  // 9. Handle Disconnection cleanup
  socket.on('disconnect', () => {
    if (socket.activeInterviewRooms) {
      for (const interviewId of socket.activeInterviewRooms) {
        InterviewService.removeParticipant(interviewId, user.userId);
        socket.to(`interview:${interviewId}`).emit('user_left_interview', {
          userId: user.userId,
          role: user.role,
        });
        console.log(`[Socket] User ${user.userId} auto-disconnected from interview ${interviewId}`);
      }
      socket.activeInterviewRooms.clear();
    }
  });
};
