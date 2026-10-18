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

const MAX_RETRIES = 2;

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
  /** Less thinking = faster answers on reasoning models. Dropped if the model rejects it. */
  reasoningEffort?: 'low' | 'medium' | 'high';
}): Promise<string> {
  const key = process.env.FIREWORKS_API_KEY?.trim();
  if (!key) throw new AiNotConfiguredError();

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.1,
    // Generous: some models emit reasoning before the answer.
    max_tokens: opts.maxTokens ?? 2000,
    ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
  };
  const config = {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    timeout: opts.timeoutMs ?? 45_000,
  };

  // Bursts (many people scanning at once) can hit Fireworks' rate limit (429)
  // or load shedding (503). Both come back fast, so retry a couple of times
  // with backoff instead of failing the scan. Timeouts are not retried.
  let response;
  for (let attempt = 0; ; attempt++) {
    try {
      response = await axios.post(FIREWORKS_API_URL, body, config);
      break;
    } catch (error: any) {
      const status = error?.response?.status;
      // A model that doesn't take reasoning_effort: retry once without it.
      if (status === 400 && 'reasoning_effort' in body) {
        delete body.reasoning_effort;
        continue;
      }
      if (attempt >= MAX_RETRIES || (status !== 429 && status !== 503)) throw error;
      const retryAfter = Number(error.response?.headers?.['retry-after']);
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5_000)
        : 700 * 2 ** attempt + Math.random() * 400;
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const raw = response.data?.choices?.[0]?.message?.content;
  const text = Array.isArray(raw)
    ? raw.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('')
    : String(raw ?? '');
  const answer = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!answer) {
    // Usually a reasoning model that spent the whole token budget thinking.
    const finish = response.data?.choices?.[0]?.finish_reason;
    throw new Error(`Empty AI response (finish_reason=${finish ?? 'unknown'}, usage=${JSON.stringify(response.data?.usage ?? {})})`);
  }
  return answer;
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
