import Groq from "groq-sdk";
import { ROLES, EXPERIENCE_LEVELS, type RoleType, type ExperienceLevel } from "../components/RoleFilters";

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type ScoreLevel = "poor" | "average" | "good" | "very_good" | "excellent";

export interface ScoringResult {
  score: ScoreLevel;
  percentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  keywordMatches: string[];
  missingKeywords: string[];
}

function getScorePrompt(role: string, experience: string): string {
  return `You are an expert ATS (Applicant Tracking System) and HR professional specializing in tech recruitment.

You are evaluating a candidate for a **${role}** position at the **${experience}** level.

Analyze the provided resume against the job description and provide a detailed assessment.

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

export async function scoreResume(
  resumeText: string,
  jobDescription: string,
  roleType: RoleType,
  experienceLevel: ExperienceLevel
): Promise<ScoringResult> {
  const role = ROLES.find(r => r.value === roleType)?.label || roleType;
  const experience = EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label || experienceLevel;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: getScorePrompt(role, experience) },
        {
          role: "user",
          content: `RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    return JSON.parse(content) as ScoringResult;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      if (status === 401) {
        throw new Error("Invalid API key. Please check your Groq API key.");
      }
    }
    throw error;
  }
}
