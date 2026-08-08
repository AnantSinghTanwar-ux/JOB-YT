import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { ApplicationModel } from '../models/application.model';
import pool from '../config/database';
import { JwtPayload } from '../types';
import axios from 'axios';

jest.mock('axios');

const mockCreateTranscription = jest.fn();
jest.mock('groq-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        audio: {
          transcriptions: {
            create: mockCreateTranscription,
          },
        },
      };
    }),
    toFile: jest.fn().mockResolvedValue({}),
  };
});


jest.mock('../config/database', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

jest.mock('../models/application.model', () => ({
  ApplicationModel: {
    findById: jest.fn(),
    findRecruiterApplicationById: jest.fn(),
  },
}));

jest.mock('../models/interview.model', () => ({
  InterviewModel: {
    createInterview: jest.fn(),
    getById: jest.fn(),
    listUserInterviews: jest.fn(),
    updateInterview: jest.fn(),
    isParticipant: jest.fn(),
  },
}));

describe('InterviewService', () => {
  const mockRequester: JwtPayload = {
    userId: 'recruiter-1',
    email: 'recruiter@company.com',
    role: 'recruiter',
  };

  const mockCandidate: JwtPayload = {
    userId: 'candidate-1',
    email: 'candidate@example.com',
    role: 'applicant',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleInterview', () => {
    it('should throw NotFoundError if application does not exist', async () => {
      (ApplicationModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        InterviewService.scheduleInterview('app-1', new Date(Date.now() + 86400000), mockRequester),
      ).rejects.toThrow('Application not found');
    });

    it('should throw ForbiddenError if recruiter is not owner of application', async () => {
      (ApplicationModel.findById as jest.Mock).mockResolvedValue({ applicant_id: 'candidate-1' });
      (ApplicationModel.findRecruiterApplicationById as jest.Mock).mockResolvedValue(null);

      await expect(
        InterviewService.scheduleInterview('app-1', new Date(Date.now() + 86400000), mockRequester),
      ).rejects.toThrow('You are not authorized to schedule an interview');
    });

    it('should throw BadRequestError if scheduled date is in the past', async () => {
      (ApplicationModel.findById as jest.Mock).mockResolvedValue({ applicant_id: 'candidate-1' });
      (ApplicationModel.findRecruiterApplicationById as jest.Mock).mockResolvedValue({ id: 'app-1' });

      await expect(
        InterviewService.scheduleInterview('app-1', new Date(Date.now() - 10000), mockRequester),
      ).rejects.toThrow('Scheduled date must be in the future');
    });

    it('should successfully schedule and save to database', async () => {
      const scheduledDate = new Date(Date.now() + 86400000);
      (ApplicationModel.findById as jest.Mock).mockResolvedValue({ applicant_id: 'candidate-1' });
      (ApplicationModel.findRecruiterApplicationById as jest.Mock).mockResolvedValue({ id: 'app-1' });
      (InterviewModel.createInterview as jest.Mock).mockResolvedValue({
        id: 'interview-1',
        application_id: 'app-1',
        interviewer_id: 'recruiter-1',
        candidate_id: 'candidate-1',
        status: 'scheduled',
        scheduled_at: scheduledDate,
      });

      const result = await InterviewService.scheduleInterview('app-1', scheduledDate, mockRequester);

      expect(InterviewModel.createInterview).toHaveBeenCalledWith({
        application_id: 'app-1',
        interviewer_id: 'recruiter-1',
        candidate_id: 'candidate-1',
        scheduled_at: scheduledDate,
      });
      expect(result.status).toBe('scheduled');
    });
  });

  describe('live session management', () => {
    const mockInterview = {
      id: 'interview-1',
      application_id: 'app-1',
      interviewer_id: 'recruiter-1',
      candidate_id: 'candidate-1',
      status: 'scheduled',
      code_content: '// initial code',
      code_language: 'javascript',
      notes: 'old notes',
    };

    beforeEach(() => {
      (InterviewModel.getById as jest.Mock).mockResolvedValue(mockInterview);
    });

    it('should successfully start an interview and initialize live session', async () => {
      (InterviewModel.updateInterview as jest.Mock).mockResolvedValue({
        ...mockInterview,
        status: 'live',
        started_at: new Date(),
      });

      const result = await InterviewService.startInterview('interview-1', mockRequester);

      expect(InterviewModel.updateInterview).toHaveBeenCalledWith('interview-1', {
        status: 'live',
        started_at: expect.any(Date),
      });
      expect(result.status).toBe('live');

      // Verify in-memory session initialization
      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession).not.toBeNull();
      expect(liveSession?.code).toBe('// initial code');
      expect(liveSession?.language).toBe('javascript');
      expect(liveSession?.notes).toBe('old notes');
    });

    it('should synchronize live code modifications in memory', async () => {
      InterviewService.updateLiveCode('interview-1', 'console.log("hello");');
      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession?.code).toBe('console.log("hello");');
    });

    it('should update recruiter private notes and database', async () => {
      (InterviewModel.updateInterview as jest.Mock).mockResolvedValue({
        ...mockInterview,
        notes: 'new notes updated',
      });

      await InterviewService.updateNotes('interview-1', 'new notes updated', mockRequester);

      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession?.notes).toBe('new notes updated');
      expect(InterviewModel.updateInterview).toHaveBeenCalledWith('interview-1', {
        notes: 'new notes updated',
      });
    });

    it('should save playground state and close session when ended', async () => {
      (InterviewModel.updateInterview as jest.Mock).mockResolvedValue({
        ...mockInterview,
        status: 'completed',
        code_content: 'console.log("hello");',
        notes: 'new notes updated',
        feedback: 'good candidate',
        rating: 5,
      });

      const result = await InterviewService.endInterview(
        'interview-1',
        { feedback: 'good candidate', rating: 5 },
        mockRequester,
      );

      expect(InterviewModel.updateInterview).toHaveBeenCalledWith('interview-1', {
        status: 'completed',
        ended_at: expect.any(Date),
        code_content: 'console.log("hello");',
        code_language: 'javascript',
        notes: 'new notes updated',
        feedback: 'good candidate',
        rating: 5,
      });
      expect(result.status).toBe('completed');

      // Live session should be garbage collected/cleaned up
      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession).toBeNull();
    });
  });

  describe('generateFollowupQuestion', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      jest.clearAllMocks();
    });

    it('should fallback to Groq when Claude is not configured', async () => {
      process.env.CLAUDE_API_KEY = '';
      process.env.GROQ_API_KEY = 'gsk_mock_key';

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'Mocked Groq response question?',
              },
            },
          ],
        },
      });

      const question = await InterviewService.generateFollowupQuestion(
        'interview-1',
        'const a = 1;',
        'javascript',
      );

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile',
        }),
        expect.any(Object),
      );
      expect(question).toBe('Mocked Groq response question?');
    });

    it('should call Claude API directly when configured', async () => {
      process.env.CLAUDE_API_KEY = 'claude_mock_key';
      process.env.GROQ_API_KEY = '';

      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          content: [
            {
              text: 'Mocked Claude response question?',
            },
          ],
        },
      });

      const question = await InterviewService.generateFollowupQuestion(
        'interview-1',
        'const a = 1;',
        'javascript',
      );

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
        }),
        expect.any(Object),
      );
      expect(question).toBe('Mocked Claude response question?');
    });
  });

  describe('transcribeAudio', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      (InterviewModel.getById as jest.Mock).mockResolvedValue({
        id: 'interview-1',
        candidate_id: 'candidate-1',
        interviewer_id: 'recruiter-1',
        status: 'live',
      });
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      jest.clearAllMocks();
    });

    it('should throw ForbiddenError if requester is not participant', async () => {
      const wrongRequester = { userId: 'intruder-1', role: 'applicant' } as JwtPayload;
      await expect(
        InterviewService.transcribeAudio('interview-1', Buffer.from([]), 'test.webm', wrongRequester)
      ).rejects.toThrow('You are not authorized to participate');
    });

    it('should throw BadRequestError if GROQ_API_KEY is missing', async () => {
      process.env.GROQ_API_KEY = '';
      await expect(
        InterviewService.transcribeAudio('interview-1', Buffer.from([]), 'test.webm', mockRequester)
      ).rejects.toThrow('Groq API Key is not configured');
    });

    it('should call groq-sdk and return transcribed text', async () => {
      process.env.GROQ_API_KEY = 'gsk_mock_key';
      mockCreateTranscription.mockResolvedValue({ text: 'Hello, this is a test' });

      const text = await InterviewService.transcribeAudio(
        'interview-1',
        Buffer.from([1, 2, 3]),
        'test.webm',
        mockRequester,
      );

      expect(mockCreateTranscription).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-large-v3',
          temperature: 0,
        }),
      );
      expect(text).toBe('Hello, this is a test');
    });
  });

  describe('generateTTS', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      (InterviewModel.getById as jest.Mock).mockResolvedValue({
        id: 'interview-1',
        candidate_id: 'candidate-1',
        interviewer_id: 'recruiter-1',
        status: 'live',
      });
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      jest.clearAllMocks();
    });

    it('should throw ForbiddenError if requester is not a participant', async () => {
      const wrongRequester = { userId: 'intruder-1', role: 'applicant' } as JwtPayload;
      await expect(
        InterviewService.generateTTS('interview-1', 'Hello', wrongRequester)
      ).rejects.toThrow('You are not authorized to participate');
    });

    it('should throw BadRequestError if text is empty', async () => {
      await expect(
        InterviewService.generateTTS('interview-1', '', mockCandidate)
      ).rejects.toThrow('Text prompt is required for TTS synthesis');
    });

    it('should use OpenAI TTS when OPENAI_API_KEY is configured', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
      process.env.ELEVENLABS_API_KEY = '';

      const expectedBuffer = Buffer.from('mock-openai-audio');
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: expectedBuffer,
      });

      const result = await InterviewService.generateTTS('interview-1', 'Hello OpenAI', mockCandidate);

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: 'Hello OpenAI',
          voice: 'alloy',
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-mock-openai-key',
          }),
          responseType: 'arraybuffer',
        })
      );
      expect(result.toString()).toBe('mock-openai-audio');
    });

    it('should fallback to ElevenLabs TTS when OpenAI fails but ELEVENLABS_API_KEY is configured', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
      process.env.ELEVENLABS_API_KEY = 'mock-elevenlabs-key';
      process.env.ELEVENLABS_VOICE_ID = 'voice-123';

      // First call (OpenAI) fails
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('OpenAI error'));
      // Second call (ElevenLabs) succeeds
      const expectedBuffer = Buffer.from('mock-elevenlabs-audio');
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: expectedBuffer,
      });

      const result = await InterviewService.generateTTS('interview-1', 'Hello Eleven', mockCandidate);

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenLastCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/voice-123',
        {
          text: 'Hello Eleven',
          model_id: 'eleven_monolingual_v1',
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'xi-api-key': 'mock-elevenlabs-key',
          }),
          responseType: 'arraybuffer',
        })
      );
      expect(result.toString()).toBe('mock-elevenlabs-audio');
    });

    it('should fallback to Google Translate TTS when all other APIs fail or are unconfigured', async () => {
      process.env.OPENAI_API_KEY = '';
      process.env.ELEVENLABS_API_KEY = '';

      const expectedBuffer = Buffer.from('mock-google-audio');
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: expectedBuffer,
      });

      const result = await InterviewService.generateTTS('interview-1', 'Hello Google', mockCandidate);

      expect(axios.get).toHaveBeenCalledWith(
        'https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=Hello%20Google',
        expect.objectContaining({
          responseType: 'arraybuffer',
          headers: expect.any(Object),
        })
      );
      expect(result.toString()).toBe('mock-google-audio');
    });

    it('should throw BadRequestError if Google Translate fallback also fails', async () => {
      process.env.OPENAI_API_KEY = '';
      process.env.ELEVENLABS_API_KEY = '';

      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Google Translate failed'));

      await expect(
        InterviewService.generateTTS('interview-1', 'Hello Fail', mockCandidate)
      ).rejects.toThrow('Failed to generate Text-to-Speech audio');
    });
  });
});
