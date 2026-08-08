import { spawn } from 'child_process';
import path from 'path';
import { ParsedResumeData, ResumeParserProvider } from './ResumeParserProvider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class PythonResumeParser implements ResumeParserProvider {
  private readonly pythonScriptPath: string;

  private readonly venvPythonPath: string;

  constructor() {
    this.pythonScriptPath = path.resolve(__dirname, '../python/parse_resume.py');
    this.venvPythonPath = path.resolve(__dirname, '../python/venv/bin/python');
  }

  async parse(filePath: string): Promise<ParsedResumeData> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.venvPythonPath, [this.pythonScriptPath, filePath]);
      
      let dataString = '';
      let errorString = '';

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python parser exited with code ${code}. Error: ${errorString}`);
          return reject(new Error(`Python parse failed: ${errorString}`));
        }

        try {
          const parsed: ParsedResumeData = JSON.parse(dataString);
          resolve(parsed);
        } catch (err) {
          logger.error(`Failed to parse Python script output: ${dataString}`);
          reject(new Error(`Failed to parse Python script output: ${err}`));
        }
      });
    });
  }
}
