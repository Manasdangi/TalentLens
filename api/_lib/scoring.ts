export type ScoreLevel = 'poor' | 'average' | 'good' | 'very_good' | 'excellent';

export interface ScoringResult {
  score: ScoreLevel;
  percentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  keywordMatches: string[];
  missingKeywords: string[];
}

export const ROLE_LABELS: Record<string, string> = {
  frontend: 'Frontend Developer',
  backend: 'Backend Developer',
  fullstack: 'Full Stack Developer',
  react_native: 'React Native Developer',
  ios: 'iOS Developer',
  android: 'Android Developer',
  flutter: 'Flutter Developer',
  devops: 'DevOps Engineer',
  data: 'Data Engineer',
  ml: 'ML Engineer',
  other: 'Other',
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  fresher: 'Fresher (0-1 years)',
  junior: 'Junior (1-2 years)',
  mid: 'Mid-Level (2-4 years)',
  senior: 'Senior (4-7 years)',
  lead: 'Lead (7-10 years)',
  principal: 'Principal (10+ years)',
};

export function getScorePrompt(role: string, experience: string, hasJobDescription: boolean): string {
  const jobDescriptionContext = hasJobDescription
    ? 'Analyze the provided resume against the job description and provide a detailed assessment.'
    : "Analyze the provided resume based on general best practices for this role and experience level. Since no specific job description was provided, focus on the resume's overall quality, relevance to the role, and general industry standards.";

  return `You are an expert ATS (Applicant Tracking System) and HR professional specializing in tech recruitment.

You are evaluating a candidate for a **${role}** position at the **${experience}** level.

${jobDescriptionContext}

Return your response as a valid JSON object with this exact structure:
{
  "score": "poor" | "average" | "good" | "very_good" | "excellent",
  "percentage": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "keywordMatches": ["<matched keyword 1>", "<matched keyword 2>", ...],
  "missingKeywords": ["<missing keyword 1>", "<missing keyword 2>", ...]
}

Scoring Guidelines:
- poor (0-20%): Major gaps, irrelevant experience, missing critical skills
- average (21-40%): Some relevant experience but significant gaps
- good (41-60%): Decent match with room for improvement
- very_good (61-80%): Strong match with minor gaps
- excellent (81-100%): Near-perfect or perfect match

Consider the specific requirements for a ${role} at ${experience} level:
- Evaluate technical skills relevant to the role
- Check for appropriate years of experience
- Look for relevant projects and achievements
- Assess soft skills and leadership (especially for senior roles)
- Consider industry-specific requirements

Be specific and actionable in your feedback. Focus on:
1. Skills alignment for ${role}
2. Experience level appropriateness
3. Keyword optimization
4. Quantifiable achievements
5. Industry-specific requirements

IMPORTANT: Return ONLY valid JSON, no markdown or extra text.`;
}

export function isScoringResult(value: unknown): value is ScoringResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ScoringResult>;
  return (
    typeof result.score === 'string' &&
    typeof result.percentage === 'number' &&
    typeof result.summary === 'string' &&
    Array.isArray(result.strengths) &&
    Array.isArray(result.improvements) &&
    Array.isArray(result.keywordMatches) &&
    Array.isArray(result.missingKeywords)
  );
}
