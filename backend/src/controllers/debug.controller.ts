import { Request, Response } from 'express';
import { aiConfig } from '../config/ai.config';

export const debugInfo = (req: Request, res: Response) => {
  res.json({
    timeoutMs: aiConfig.timeoutMs,
    groqKeyLength: aiConfig.groqApiKey ? aiConfig.groqApiKey.length : 0,
    groqKeyEndsWith: aiConfig.groqApiKey ? aiConfig.groqApiKey.slice(-5) : 'N/A',
    timestamp: new Date().toISOString()
  });
};
