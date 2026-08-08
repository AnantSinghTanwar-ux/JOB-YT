import { ResumeParserProvider, ParsedResumeData } from './ResumeParserProvider';
import { PythonResumeParser } from './PythonResumeParser';
import fs from 'fs';
import path from 'path';

export class ResumeParsingService {
  private static provider: ResumeParserProvider = new PythonResumeParser();

  /**
   * Parses a resume file (PDF) and returns structured JSON data.
   * If the file is passed as a buffer, it writes it to a temporary file,
   * parses it, and then deletes the temp file.
   */
  public static async parse(fileBuffer: Buffer, fileName: string): Promise<ParsedResumeData> {
    const tempDir = path.resolve(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${Date.now()}_${fileName}`);
    
    try {
      // Write buffer to temp file so Python script can access it
      fs.writeFileSync(tempFilePath, fileBuffer);
      
      // Parse using the provider
      const result = await this.provider.parse(tempFilePath);
      return result;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Switch the underlying provider at runtime if necessary
   */
  public static setProvider(provider: ResumeParserProvider) {
    this.provider = provider;
  }
}
