import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { checkAndIncrementAiQuota, refundAiQuota, requestTimeZone } from '@/lib/ai-rate-limit';
import { VISION_MODEL, fireworksChat, extractJson, describeAiError } from '@/lib/fireworks';

// Vercel rejects request bodies over 4.5 MB before they reach us; the app
// downsizes photos to ~1024px (~200 KB), so this is only a sanity cap.
const MAX_BASE64_LENGTH = 4_000_000;

interface VisionResponse {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

// AI calls can take up to ~30s; don't let the function be cut off first.
export const maxDuration = 60;

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
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    if (!process.env.FIREWORKS_API_KEY?.trim()) {
      console.error('[POST /api/vision] FIREWORKS_API_KEY is not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // ── 限流检查（与 diet-analysis 共享同一计数器）──────────────────────────
    const quota = await checkAndIncrementAiQuota(userId, requestTimeZone(request));
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

    try {
      const content = await fireworksChat({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: 'text', text: promptText },
            ],
          },
        ],
        temperature: 0.1,
      });

      const analysis = extractJson<VisionResponse>(content);
      const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);
      if (!analysis.food || !isFinite(Number(analysis.calories))) {
        throw new Error(`Invalid AI response: ${content.slice(0, 200)}`);
      }

      return NextResponse.json({
        food: String(analysis.food),
        calories: Math.round(num(analysis.calories)),
        protein: Math.round(num(analysis.protein)),
        carbs: Math.round(num(analysis.carbs)),
        fat: Math.round(num(analysis.fat)),
        confidence: Math.min(1, Math.max(0, num(analysis.confidence) || 0.5)),
        remaining: quota.remaining,
      });
    } catch (error) {
      // AI failed after we took a quota unit — give it back and log why.
      await refundAiQuota(userId);
      console.error('[POST /api/vision] AI call failed', { model: VISION_MODEL, mode: analysisMode, reason: describeAiError(error) });
      return NextResponse.json({ error: 'Image analysis failed' }, { status: 502 });
    }
  } catch (error) {
    console.error('[POST /api/vision]', error);
    return NextResponse.json({ error: 'Image analysis failed' }, { status: 500 });
  }
}
