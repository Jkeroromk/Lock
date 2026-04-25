import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { authenticateRequest } from '@/lib/auth';
import { checkAndIncrementAiQuota } from '@/lib/ai-rate-limit';

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY?.trim();
const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const FIREWORKS_TIMEOUT_MS = 30_000;

// base64 编码的 10MB 图片约为 13,981,013 字符
const MAX_BASE64_LENGTH = 14_000_000;

interface VisionResponse {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  // 认证
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const { image, lang, mode } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    }

    if (typeof image !== 'string' || image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
    }

    if (!FIREWORKS_API_KEY) {
      return NextResponse.json({ error: 'Fireworks API key not configured' }, { status: 500 });
    }

    // ── 限流检查（与 diet-analysis 共享同一计数器）──────────────────────────
    const quota = await checkAndIncrementAiQuota(userId);
    if (!quota.ok) return quota.response;
    // ────────────────────────────────────────────────────────────────────────

    // Build language-specific prompt
    const langPromptMap: Record<string, string> = {
      'zh-CN': '请用简体中文命名食物。',
      'zh-TW': '請用繁體中文命名食物。',
      'ja-JP': '食べ物の名前は日本語で記載してください。',
      'ko-KR': '음식 이름을 한국어로 작성해주세요.',
      'en-US': 'Name the food in English.',
    };
    const langInstruction = langPromptMap[lang] ?? langPromptMap['en-US'];

    const analysisMode = mode === 'label' ? 'label' : 'food';
    const promptText = analysisMode === 'label'
      ? `This image shows a nutrition facts label or nutrition information table. Extract the nutritional data and return JSON in exactly this format:
{
  "food": "<product name if visible on label, otherwise 'Nutrition Label'>",
  "calories": <number — kcal per serving>,
  "protein": <number in grams per serving>,
  "carbs": <number in grams per serving>,
  "fat": <number in grams per serving>,
  "confidence": <number between 0 and 1>
}

Instructions:
- Find the serving size first and use per-serving values (not per 100g).
- If only per-100g values are present, use those.
- Look for: Calories/Energy, Total Fat, Total Carbohydrate, Protein.
- Return only the JSON, no other text.`
      : `Analyze this food image and return JSON in exactly this format:
{
  "food": "<food name>",
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "confidence": <number between 0 and 1>
}

${langInstruction}
Return only the JSON, no other text.`;

    const response = await axios.post(
      FIREWORKS_API_URL,
      {
        model: 'accounts/fireworks/models/qwen3-vl-30b-a3b-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}` },
              },
              { type: 'text', text: promptText },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${FIREWORKS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: FIREWORKS_TIMEOUT_MS,
      }
    );

    const content = response.data.choices[0]?.message?.content || '';

    let analysis: VisionResponse;
    try {
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonContent);
    } catch {
      analysis = { food: 'Unknown food', calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0.5 };
    }

    if (!analysis.food || typeof analysis.calories !== 'number') {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    return NextResponse.json({ ...analysis, remaining: quota.remaining });
  } catch (error: any) {
    return NextResponse.json({ error: 'Image analysis failed' }, { status: 500 });
  }
}
