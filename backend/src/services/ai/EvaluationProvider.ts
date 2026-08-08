export interface EvaluationResult {
  communication: {
    fluency: number;
    grammar: number;
    clarity: number;
    confidence: number;
    speaking_pace: number;
  };
  technical: {
    correctness: number;
    reasoning: number;
    depth: number;
    problem_solving: number;
  };
  behavioural: {
    leadership: number;
    teamwork: number;
    adaptability: number;
    critical_thinking: number;
  };
  summary: string;
}

export interface EvaluationProvider {
  /**
   * Evaluates a candidate's video interview based on transcript and prompt.
   * @param transcript The transcription text
   * @param jobContext Context about the job and questions
   */
  evaluateInterview(transcript: string, jobContext: any): Promise<EvaluationResult>;
}

export class LocalLLMProvider implements EvaluationProvider {
  async evaluateInterview(transcript: string, jobContext: any): Promise<EvaluationResult> {
    // Stub implementation for Local LLM (e.g., Ollama / vLLM)
    // In a real implementation, this would make an HTTP request to the local LLM endpoint
    // enforcing strict JSON schema output.
    console.log('[LocalLLMProvider] Evaluating transcript of length:', transcript.length);
    
    // Simulate async LLM processing
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    return {
      communication: {
        fluency: 85,
        grammar: 90,
        clarity: 88,
        confidence: 82,
        speaking_pace: 80,
      },
      technical: {
        correctness: 80,
        reasoning: 85,
        depth: 75,
        problem_solving: 82,
      },
      behavioural: {
        leadership: 70,
        teamwork: 85,
        adaptability: 88,
        critical_thinking: 80,
      },
      summary: "The candidate demonstrated strong communication skills and good technical reasoning, though they could improve on in-depth problem solving explanations."
    };
  }
}

export const evaluationProvider = new LocalLLMProvider();
