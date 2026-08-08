import prisma from '../config/prisma';

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description: string;
}

const BUILTIN_TEMPLATES: Record<string, PromptTemplate> = {
  coach_chat: {
    name: 'coach_chat',
    description: 'Fallback AI Career Coach chat prompt used when the database template is absent.',
    variables: ['studentContext', 'mode', 'modeInstruction', 'chatHistory', 'userMessage'],
    template: `You are the AI Career Coach for a hiring platform.

Student context:
{{studentContext}}

Current coaching mode: {{mode}}
Mode-specific instruction:
{{modeInstruction}}

Recent conversation:
{{chatHistory}}

Student message:
{{userMessage}}

Respond as a practical, supportive career coach. Be specific, concise, and action-oriented. Do not invent facts about the student; when context is missing, ask one focused follow-up question.`,
  },
  interview_questions: {
    name: 'interview_questions',
    description: 'Fallback prompt for generating suggested job interview questions.',
    variables: ['role', 'skills'],
    template: `Generate five concise interview questions for a {{role}} role.

Required skills:
{{skills}}

Return only a JSON array of strings. Do not include markdown or commentary.`,
  },
  interview_session_questions: {
    name: 'interview_session_questions',
    description: 'Fallback prompt for generating async mock interview session questions.',
    variables: ['roleTitle', 'jobDescription', 'questionCount'],
    template: `Generate {{questionCount}} mock interview questions for this role.

Role title:
{{roleTitle}}

Job description:
{{jobDescription}}

Return only valid JSON in this exact shape:
{
  "questions": [
    {
      "questionText": "Question text",
      "category": "technical",
      "expectedTopics": ["topic one", "topic two"]
    }
  ]
}

Rules:
- The questions array must contain exactly {{questionCount}} items.
- category must be one of: technical, behavioral, situational.
- expectedTopics must be an array of non-empty strings.
- Do not include markdown or commentary.`,
  },
  interview_response_evaluation: {
    name: 'interview_response_evaluation',
    description: 'Fallback prompt for evaluating a mock interview response.',
    variables: ['roleTitle', 'jobDescription', 'questionText', 'responseText'],
    template: `Evaluate this mock interview answer for the role.

Role title:
{{roleTitle}}

Job description:
{{jobDescription}}

Question:
{{questionText}}

Candidate response:
{{responseText}}

Return only valid JSON in this exact shape:
{
  "overallScore": 0,
  "rubricScores": {
    "relevance": 0,
    "specificity": 0,
    "communication": 0,
    "roleFit": 0
  },
  "feedback": {
    "summary": "Brief assessment",
    "strengths": ["strength"],
    "improvements": ["improvement"],
    "suggestedAnswer": "A stronger answer outline"
  }
}

Rules:
- Scores must be numbers from 0 to 100.
- Do not include markdown or commentary.`,
  },
  interview_question_evaluation: {
    name: 'interview_question_evaluation',
    description: 'Fallback alias for evaluating an individual interview question response.',
    variables: ['roleTitle', 'jobDescription', 'questionText', 'responseText'],
    template: `Evaluate this mock interview answer for the role.

Role title:
{{roleTitle}}

Job description:
{{jobDescription}}

Question:
{{questionText}}

Candidate response:
{{responseText}}

Return only valid JSON with overallScore, rubricScores, and feedback. Scores must be numbers from 0 to 100.`,
  },
  interview_report_generation: {
    name: 'interview_report_generation',
    description: 'Fallback prompt for generating a mock interview report summary.',
    variables: ['roleTitle', 'jobDescription', 'overallScore', 'rubricScoresJson', 'qasJson'],
    template: `Generate a final mock interview report.

Role title:
{{roleTitle}}

Job description:
{{jobDescription}}

Overall score:
{{overallScore}}

Rubric scores JSON:
{{rubricScoresJson}}

Question and answer JSON:
{{qasJson}}

Return only valid JSON in this exact shape:
{
  "summary": "Concise overall performance summary",
  "strengths": ["strength"],
  "weaknesses": ["weakness"],
  "recommendations": ["recommendation"]
}

Do not include markdown or commentary.`,
  },
  interview_report: {
    name: 'interview_report',
    description: 'Fallback alias for interview report generation.',
    variables: ['roleTitle', 'jobDescription', 'overallScore', 'rubricScoresJson', 'qasJson'],
    template: `Generate a final mock interview report for {{roleTitle}}.

Job description:
{{jobDescription}}

Overall score: {{overallScore}}
Rubric scores JSON: {{rubricScoresJson}}
Question and answer JSON: {{qasJson}}

Return only valid JSON with summary, strengths, weaknesses, and recommendations arrays.`,
  },
  interview_feedback: {
    name: 'interview_feedback',
    description: 'Fallback prompt for concise interview feedback.',
    variables: ['roleTitle', 'questionText', 'responseText'],
    template: `Provide concise interview feedback for a {{roleTitle}} candidate.

Question:
{{questionText}}

Response:
{{responseText}}

Return only valid JSON with summary, strengths, and improvements.`,
  },
  interview_summary: {
    name: 'interview_summary',
    description: 'Fallback prompt for summarizing interview performance.',
    variables: ['roleTitle', 'overallScore', 'qasJson'],
    template: `Summarize this mock interview for a {{roleTitle}} candidate.

Overall score: {{overallScore}}
Question and answer JSON:
{{qasJson}}

Return only valid JSON with summary, strengths, weaknesses, and nextSteps.`,
  },
  interview_followup: {
    name: 'interview_followup',
    description: 'Fallback prompt for generating interview follow-up practice.',
    variables: ['roleTitle', 'weaknesses'],
    template: `Generate follow-up practice prompts for a {{roleTitle}} candidate.

Weaknesses:
{{weaknesses}}

Return only valid JSON with followupQuestions and practicePlan.`,
  },
};

export const PromptTemplatesService = {
  /**
   * Get a prompt template by name from the database
   */
  async getTemplate(name: string): Promise<PromptTemplate | null> {
    const template = await prisma.prompt_templates.findUnique({
      where: { name },
    });
    return (template as PromptTemplate | null) ?? BUILTIN_TEMPLATES[name] ?? null;
  },

  /**
   * Get all available prompt templates from the database
   */
  async getAllTemplates(): Promise<PromptTemplate[]> {
    const templates = await prisma.prompt_templates.findMany();
    return templates as PromptTemplate[];
  },

  /**
   * Get names of all available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    const templates = await this.getAllTemplates();
    return templates.map((t) => t.name);
  },

  /**
   * Render a template with provided variables
   */
  async renderTemplate(templateName: string, variables: Record<string, any>): Promise<string> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found in database.`);
    }

    let rendered = template.template;

    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Check for any remaining unsubstituted variables
    const remainingVars = rendered.match(/\\{\\{(\\w+)\\}\\}/g);
    if (remainingVars) {
      const missingVars = [...new Set(remainingVars.map(v => v.slice(2, -2)))];
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return rendered;
  },

  /**
   * Validate that all required variables are provided for a template
   */
  async validateVariables(templateName: string, variables: Record<string, any>): Promise<boolean> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      return false;
    }

    return template.variables.every(varName => Object.prototype.hasOwnProperty.call(variables, varName));
  },

  /**
   * Create a new prompt template
   */
  async createTemplate(data: Omit<PromptTemplate, 'id'>): Promise<PromptTemplate> {
    const existing = await this.getTemplate(data.name);
    if (existing) {
      throw new Error(`Template with name '${data.name}' already exists.`);
    }

    const created = await prisma.prompt_templates.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        variables: data.variables,
        version: 1,
      },
    });

    return created as unknown as PromptTemplate;
  },

  /**
   * Update an existing prompt template
   */
  async updateTemplate(name: string, data: Partial<Omit<PromptTemplate, 'id' | 'name'>>): Promise<PromptTemplate> {
    const existing = await prisma.prompt_templates.findUnique({ where: { name } });
    if (!existing) {
      throw new Error(`Template '${name}' not found.`);
    }

    const updated = await prisma.prompt_templates.update({
      where: { name },
      data: {
        ...data,
        version: existing.version + 1,
      },
    });

    return updated as unknown as PromptTemplate;
  },

  /**
   * Delete a prompt template
   */
  async deleteTemplate(name: string): Promise<boolean> {
    try {
      await prisma.prompt_templates.delete({ where: { name } });
      return true;
    } catch (e) {
      return false;
    }
  }
};
