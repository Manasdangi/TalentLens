import express, { type RequestHandler } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Types
interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      email: string;
      picture?: string;
    }
  }
}

// CORS
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}) as unknown as RequestHandler);

// Passport
app.use(passport.initialize() as unknown as RequestHandler);
app.use(passport.session() as unknown as RequestHandler);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: User, done) => {
  done(null, user);
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  }, (_accessToken, _refreshToken, profile, done) => {
    const user: User = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value || '',
      picture: profile.photos?.[0]?.value,
    };
    done(null, user);
  }));
} else {
  console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`,
  }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
    } else {
      res.json({ success: true });
    }
  });
});

type ScoreLevel = 'poor' | 'average' | 'good' | 'very_good' | 'excellent';

interface ScoringResult {
  score: ScoreLevel;
  percentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  keywordMatches: string[];
  missingKeywords: string[];
}

const ROLE_LABELS: Record<string, string> = {
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

const EXPERIENCE_LABELS: Record<string, string> = {
  fresher: 'Fresher (0-1 years)',
  junior: 'Junior (1-2 years)',
  mid: 'Mid-Level (2-4 years)',
  senior: 'Senior (4-7 years)',
  lead: 'Lead (7-10 years)',
  principal: 'Principal (10+ years)',
};

function getScorePrompt(role: string, experience: string, hasJobDescription: boolean): string {
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

function isScoringResult(value: unknown): value is ScoringResult {
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

app.post('/api/score-resume', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Groq API key is not configured on the server.' });
    return;
  }

  const {
    resumeText,
    jobDescription = '',
    roleType = '',
    experienceLevel = '',
  } = req.body as {
    resumeText?: unknown;
    jobDescription?: unknown;
    roleType?: unknown;
    experienceLevel?: unknown;
  };

  if (typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    res.status(400).json({ error: 'Resume text is required.' });
    return;
  }
  if (typeof jobDescription !== 'string' || typeof roleType !== 'string' || typeof experienceLevel !== 'string') {
    res.status(400).json({ error: 'Invalid scoring request.' });
    return;
  }

  const role = ROLE_LABELS[roleType] || roleType || 'General';
  const experience = EXPERIENCE_LABELS[experienceLevel] || experienceLevel || 'Not specified';
  const hasJobDescription = jobDescription.trim().length > 0;
  const userContent = hasJobDescription
    ? `RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription}`
    : `RESUME:\n${resumeText}\n\n---\n\nNote: No specific job description was provided. Please evaluate the resume based on general best practices for a ${role} at ${experience} level.`;

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: getScorePrompt(role, experience, hasJobDescription) },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error('[score-resume] Groq request failed', {
        status: groqResponse.status,
        body: errorBody,
      });
      res.status(groqResponse.status).json({
        error: groqResponse.status === 429
          ? 'Rate limit exceeded. Please wait a moment and try again.'
          : groqResponse.status === 401
            ? 'Invalid Groq API key. Please check the server configuration.'
            : 'Failed to analyze resume.',
      });
      return;
    }

    const data = await groqResponse.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'No response from LLM.' });
      return;
    }

    const parsed = JSON.parse(content) as unknown;
    if (!isScoringResult(parsed)) {
      res.status(502).json({ error: 'LLM returned an invalid scoring result.' });
      return;
    }

    res.json(parsed);
  } catch (error) {
    console.error('[score-resume] Unexpected scoring error', error);
    res.status(500).json({ error: 'Failed to analyze resume.' });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
