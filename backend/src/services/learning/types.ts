export interface CourseMetadata {
  provider: string;
  externalId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  instructor?: string;
  durationMins?: number;
  rating?: number;
  reviewCount?: number;
  priceAmount?: number;
  priceCurrency?: string;
  skillTags: string[];
  difficulty?: string;
  language?: string;
  lastUpdated?: Date;
}

export interface SkillGapResult {
  skillName: string;
  category: string;
  importance: 'Critical' | 'Important' | 'Optional';
  confidence: number;
  source: string;
}

export interface CourseRecommendation {
  courseId?: string; // If already in DB
  metadata: CourseMetadata;
  reasoning: string;
  relevanceScore: number;
}

export interface RoadmapResult {
  targetRole: string;
  missingSkills: SkillGapResult[];
  recommendedCourses: CourseRecommendation[];
  learningSequence: string[]; // Order of skills to learn
  estimatedHours: number;
}
