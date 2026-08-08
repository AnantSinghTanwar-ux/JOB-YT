export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

export interface SpeechProvider {
  /**
   * Transcribes audio from a given file buffer or stream.
   * @param audioBuffer The audio data
   * @param options Additional options like language
   */
  transcribe(audioBuffer: Buffer, options?: any): Promise<TranscriptionResult>;
}

export class FasterWhisperProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, options?: any): Promise<TranscriptionResult> {
    // Stub implementation for Faster Whisper
    // In a real implementation, this would either spawn a Python child process
    // or call a dedicated microservice running faster-whisper.
    console.log('[FasterWhisperProvider] Transcribing audio buffer of size:', audioBuffer.length);
    
    // Simulate async transcription delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    return {
      text: "This is a simulated transcription from Faster Whisper.",
      language: "en",
      segments: [
        {
          id: 1,
          seek: 0,
          start: 0.0,
          end: 2.0,
          text: "This is a simulated transcription",
          tokens: [],
          temperature: 0,
          avg_logprob: -0.1,
          compression_ratio: 1.0,
          no_speech_prob: 0.01,
        },
        {
          id: 2,
          seek: 200,
          start: 2.0,
          end: 4.0,
          text: "from Faster Whisper.",
          tokens: [],
          temperature: 0,
          avg_logprob: -0.1,
          compression_ratio: 1.0,
          no_speech_prob: 0.01,
        }
      ]
    };
  }
}

export const speechProvider = new FasterWhisperProvider();
