const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Current Messages API version. Note: temperature/top_p/top_k are rejected with a 400 on this version.
const ANTHROPIC_VERSION = '2026-10-21';

// Haiku 5.5 is the cheapest current model and is plenty for structured resume scoring.
// Set ANTHROPIC_MODEL=claude-sonnet-5-5 for deeper feedback at a higher cost per analysis.
export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';

export class ClaudeApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Claude API request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

/**
 * Sends one prompt to the Claude Messages API and returns the concatenated text blocks.
 * Thinking blocks (the models think adaptively) are ignored.
 */
export async function askClaude(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': params.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      // Thinking tokens count toward max_tokens, so leave generous headroom for the JSON answer.
      max_tokens: params.maxTokens ?? 4000,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
    }),
    signal: AbortSignal.timeout(params.timeoutMs ?? 50_000),
  });

  if (!response.ok) {
    throw new ClaudeApiError(response.status, await response.text());
  }

  const data = (await response.json()) as { content?: ClaudeContentBlock[] };
  return (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('')
    .trim();
}

/** Extracts the first JSON object from model text, tolerating markdown fences or stray prose. */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(text.slice(start, end + 1));
}
