import { Worker, Job } from 'bullmq';
import { getRedisConnectionForWorker, getVideoEvaluationQueue } from '../config/queue';
import { speechProvider } from '../services/ai/SpeechProvider';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch'; // assuming fetch is available or use axios
import { minioStorage } from '../services/storage/MinIOProvider';

const prisma = new PrismaClient();
const LOG_PREFIX = '[VideoTranscriptionWorker]';

export const videoTranscriptionWorker = new Worker(
  'videoTranscriptionQueue',
  async (job: Job) => {
    if (job.name === 'transcribeVideo') {
      const { videoInterviewId } = job.data as { videoInterviewId: string };
      console.log(`${LOG_PREFIX} Processing transcription for video ${videoInterviewId}`);

      try {
        // 1. Fetch video record
        const videoRecord = await (prisma as any).video_interviews.findUnique({
          where: { id: videoInterviewId }
        });

        if (!videoRecord) {
          throw new Error(`Video record ${videoInterviewId} not found`);
        }

        // Update status to TRANSCRIBING
        await (prisma as any).video_interviews.update({
          where: { id: videoInterviewId },
          data: { status: 'TRANSCRIBING', updated_at: new Date() }
        });

        // 2. Download video buffer
        // Note: minioStorage.generateSignedReadUrl could be used to get a temporary URL
        // Then we fetch it into a buffer to pass to our Whisper provider
        const url = await minioStorage.generateSignedReadUrl(videoRecord.video_url, 3600);
        
        // Simulating the buffer download
        const buffer = Buffer.from('simulated-audio-buffer');

        // 3. Transcribe
        const result = await speechProvider.transcribe(buffer);

        // 4. Update DB
        await (prisma as any).video_interviews.update({
          where: { id: videoInterviewId },
          data: {
            status: 'TRANSCRIBED',
            transcript: result.text,
            language: result.language,
            segmented_transcript: result.segments as any,
            updated_at: new Date()
          }
        });

        // 5. Enqueue for Evaluation
        const veQueue = getVideoEvaluationQueue();
        if (veQueue) {
          await veQueue.add('evaluateVideo', { videoInterviewId });
        }

        console.log(`${LOG_PREFIX} Transcription completed for ${videoInterviewId}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} Error processing video ${videoInterviewId}:`, error);
        
        await (prisma as any).video_interviews.update({
          where: { id: videoInterviewId },
          data: { status: 'FAILED', updated_at: new Date() }
        });
        
        throw error;
      }
    }
  },
  {
    connection: getRedisConnectionForWorker() as any,
    concurrency: 2,
  }
);

videoTranscriptionWorker.on('failed', (job, err) => {
  console.error(`${LOG_PREFIX} Job ${job?.id} failed: ${err.message}`);
});
