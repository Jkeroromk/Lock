import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export interface MessageOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

export interface ClaudeError {
  code: 'rate_limit' | 'network' | 'content_filter' | 'auth' | 'unknown';
  message: string;
  retryAfter?: number;
}

/**
 * Sends a message to Claude and returns the response.
 * @param prompt - The user message to send
 * @param systemPrompt - Optional system prompt to set context
 * @param options - Optional model, token, and temperature settings
 * @returns The assistant's response with token usage
 * @throws ClaudeError with a normalized code for error handling
 */
export async function createMessage(
  prompt: string,
  systemPrompt?: string,
  options: MessageOptions = {}
): Promise<ClaudeResponse> {
  const { model = DEFAULT_MODEL, maxTokens = 1024, temperature = 1 } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw buildError('auth', 'ANTHROPIC_API_KEY 未配置');
  }

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    console.log(`[claude] model=${model} in=${inputTokens} out=${outputTokens}`);

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text : '';

    return { content, usage: { inputTokens, outputTokens }, model };
  } catch (err: unknown) {
    throw normalizeError(err);
  }
}

/**
 * Streams a Claude response, yielding text chunks as they arrive.
 * @param prompt - The user message to send
 * @param systemPrompt - Optional system prompt to set context
 * @param options - Optional model, token, and temperature settings
 * @yields Text chunks from the streaming response
 * @throws ClaudeError with a normalized code for error handling
 */
export async function* streamMessage(
  prompt: string,
  systemPrompt?: string,
  options: MessageOptions = {}
): AsyncGenerator<string> {
  const { model = DEFAULT_MODEL, maxTokens = 1024, temperature = 1 } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw buildError('auth', 'ANTHROPIC_API_KEY 未配置');
  }

  try {
    const stream = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      } else if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      } else if (event.type === 'message_stop') {
        console.log(`[claude/stream] model=${model} in=${inputTokens} out=${outputTokens}`);
      }
    }
  } catch (err: unknown) {
    throw normalizeError(err);
  }
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Sends an image + optional text prompt to Claude and returns the response.
 * @param base64Image - Base64-encoded image data (without data URI prefix)
 * @param mediaType - MIME type of the image
 * @param textPrompt - Text prompt to accompany the image
 * @param systemPrompt - Optional system prompt
 * @param options - Optional model/token settings
 */
export async function analyzeImage(
  base64Image: string,
  mediaType: ImageMediaType,
  textPrompt: string,
  systemPrompt?: string,
  options: MessageOptions = {}
): Promise<ClaudeResponse> {
  const { model = DEFAULT_MODEL, maxTokens = 1024, temperature = 1 } = options;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw buildError('auth', 'ANTHROPIC_API_KEY 未配置');
  }

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            { type: 'text', text: textPrompt },
          ],
        },
      ],
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    console.log(`[claude/vision] model=${model} in=${inputTokens} out=${outputTokens}`);

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text : '';
    return { content, usage: { inputTokens, outputTokens }, model };
  } catch (err: unknown) {
    throw normalizeError(err);
  }
}

function normalizeError(err: unknown): ClaudeError {
  if (err instanceof Anthropic.RateLimitError) {
    const headers = err.headers as Record<string, string> | undefined;
    const retryAfter = Number(headers?.['retry-after'] ?? 60);
    return buildError('rate_limit', '请求频率超限，请稍后重试', retryAfter);
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return buildError('auth', 'API key 无效或未授权');
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return buildError('content_filter', '请求被内容过滤策略拒绝');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return buildError('network', '网络连接失败，请检查网络后重试');
  }
  if (err instanceof Error) {
    return buildError('unknown', err.message);
  }
  return buildError('unknown', '未知错误');
}

function buildError(code: ClaudeError['code'], message: string, retryAfter?: number): ClaudeError {
  const error: ClaudeError = { code, message };
  if (retryAfter !== undefined) error.retryAfter = retryAfter;
  return error;
}
