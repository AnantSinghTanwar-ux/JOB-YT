import { buildMatchReason } from '../services/autoApplyMatch.service';
import { HybridScoreResult } from '../services/unifiedMatch.service';

describe('AutoApplyMatchService', () => {
  const hybrid: HybridScoreResult = {
    finalMatchScore: 82,
    semanticScore: 78,
    skillsScore: 85,
    experienceScore: 70,
    keywordScore: 60,
    educationScore: 90,
    matchedSkills: ['React', 'TypeScript'],
    missingSkills: ['GraphQL'],
    fuzzyMatchedSkills: [],
    keywordOverlap: [],
    recommendations: [],
    scoringVersion: 'v1.0',
    embeddingAvailable: true,
  };

  it('buildMatchReason produces first-class explainability fields', () => {
    const reason = buildMatchReason(hybrid, { location: 'Remote' }, { target_locations: ['remote'] });
    expect(reason.overall).toBe(82);
    expect(reason.skills.matchedSkills).toContain('React');
    expect(reason.location.matched).toBe(true);
    expect(reason.human_summary).toContain('82%');
    expect(reason.exclusion_reason).toBeNull();
  });
});
