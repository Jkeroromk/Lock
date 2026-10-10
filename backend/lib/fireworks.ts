import axios from 'axios';

/**
 * Fireworks AI client shared by the vision and diet-analysis routes.
 *
 * Model IDs are configurable via env so a model being retired from Fireworks'
 * serverless tier (which is what broke food recognition — qwen3-vl-30b-a3b-instruct
 * and qwen3-30b-a3b-instruct are no longer serverless) is a config change,
 * not a code change. The default must support serverless + image input.
 */
const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const DEFAULT_MODEL = 'accounts/fireworks/models/glm-5p3-flash';

export const VISION_MODEL = process.env.FIREWORKS_VISION_MODEL?.trim() || DEFAULT_MODEL;
export const TEXT_MODEL = process.env.FIREWORKS_TEXT_MODEL?.trim() || VISION_MODEL;

export class AiNotConfiguredError extends Error {
  constructor() {
    super('FIREWORKS_API_KEY is not configured');
  }
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** Calls Fireworks chat completions and returns the assistant text (reasoning stripped). */
export async function fireworksChat(opts: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const key = process.env.FIREWORKS_API_KEY?.trim();
  if (!key) throw new AiNotConfiguredError();

  const response = await axios.post(
    FIREWORKS_API_URL,
    {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.1,
      // Generous: some models emit reasoning before the answer.
      max_tokens: opts.maxTokens ?? 2000,
    },
    {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: opts.timeoutMs ?? 45_000,
    }
  );

  const raw = response.data?.choices?.[0]?.message?.content;
  const text = Array.isArray(raw)
    ? raw.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('')
    : String(raw ?? '');
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/** Extracts and parses the first JSON object in a model response. Throws if none. */
export function extractJson<T>(content: string): T {
  const cleaned = content.replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error(`No JSON object in AI response: ${content.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Compact, secret-free description of an AI call failure for logs. */
export function describeAiError(error: any): string {
  if (error?.response) {
    const body = JSON.stringify(error.response.data ?? '').slice(0, 300);
    return `Fireworks HTTP ${error.response.status}: ${body}`;
  }
  if (error?.code === 'ECONNABORTED') return 'Fireworks request timed out';
  return error?.message ?? String(error);
}
