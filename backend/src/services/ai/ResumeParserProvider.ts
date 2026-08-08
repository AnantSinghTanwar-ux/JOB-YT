export interface ParsedResumeData {
  personal_information: {
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
  };
  education: any[];
  experience: any[];
  skills: string[];
  projects: any[];
  certifications: string[];
  publications: string[];
  awards: string[];
  languages: string[];
  raw_text: string;
}

export interface ResumeParserProvider {
  parse(filePath: string): Promise<ParsedResumeData>;
}
