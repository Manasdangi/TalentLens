import type { RoleType, ExperienceLevel } from "../constants";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

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

export async function scoreResume(
  resumeText: string,
  jobDescription: string,
  roleType: RoleType,
  experienceLevel: ExperienceLevel
): Promise<ScoringResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/score-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        roleType,
        experienceLevel,
      }),
    });

    const payload = await response.json() as ScoringResult | { error?: string };
    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "Failed to analyze resume");
    }

    return payload as ScoringResult;
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new Error("Could not reach the scoring server. Please make sure the backend is running.");
    }
    throw error;
  }
}
