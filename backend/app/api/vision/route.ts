import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { checkAndIncrementAiQuota } from '@/lib/ai-rate-limit';
import { trustedTimeZone } from '@/lib/timezone';
import { VISION_MODEL, fireworksChat, extractJson, describeAiError } from '@/lib/fireworks';

// Vercel rejects request bodies over 4.5 MB before they reach us; the app
// downsizes photos to ~1024px (~200 KB), so this is only a sanity cap.
const MAX_BASE64_LENGTH = 4_000_000;

interface VisionItem {
  name: string;
  portion?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface VisionResponse {
  /** Label mode, and older single-food answers. */
  food?: string;
  items?: VisionItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

/** "南瓜、水煮蛋、山药" / "Pumpkin, Boiled eggs, Yam". */
function joinNames(names: string[], lang: string | undefined): string {
  const cjk = typeof lang === 'string' && (lang.startsWith('zh') || lang.startsWith('ja'));
  const joined = names.join(cjk ? '、' : ', ');
  return joined.length > 80 ? `${joined.slice(0, 79)}…` : joined;
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
    const quota = await checkAndIncrementAiQuota(userId, await trustedTimeZone(userId, request));
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
      : `Analyze this meal photo. Identify EVERY separate food that is part of the meal, not just the biggest one.
Return JSON in exactly this format:
{
  "items": [
    { "name": "<food name>", "portion": "<count and/or estimated grams, e.g. '2 eggs (~100 g)'>", "calories": <number>, "protein": <grams>, "carbs": <grams>, "fat": <grams> }
  ],
  "confidence": <number between 0 and 1>
}

Rules:
- List each food on its own: e.g. pumpkin on one plate and eggs plus yam on another are three items.
- Count pieces (2 eggs, 3 dumplings) and estimate each portion from its size; a dinner plate is about 22 cm across.
- Nutrition values are for the whole visible portion of that item, not per 100 g.
- Leave out: sealed or unopened packages and drink cartons, screens, decorations, utensils, empty containers. Include a drink only if it is poured into a glass or cup.
- If the photo shows a single dish, return one item.
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
        maxTokens: 3000,
      });

      const analysis = extractJson<VisionResponse>(content);
      const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);

      // Food photos: add up every item so side dishes (e.g. two eggs) count.
      const items = Array.isArray(analysis.items)
        ? analysis.items.filter((it) => it && typeof it.name === 'string' && it.name.trim() && isFinite(num(it.calories)))
        : [];
      let food: string;
      let totals: { calories: number; protein: number; carbs: number; fat: number };
      if (items.length > 0) {
        food = joinNames(items.map((it) => it.name.trim()), lang);
        totals = items.reduce(
          (t, it) => ({
            calories: t.calories + Math.max(0, num(it.calories)),
            protein: t.protein + Math.max(0, num(it.protein)),
            carbs: t.carbs + Math.max(0, num(it.carbs)),
            fat: t.fat + Math.max(0, num(it.fat)),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );
      } else if (analysis.food && isFinite(Number(analysis.calories))) {
        food = String(analysis.food);
        totals = {
          calories: num(analysis.calories), protein: num(analysis.protein),
          carbs: num(analysis.carbs), fat: num(analysis.fat),
        };
      } else {
        throw new Error(`Invalid AI response: ${content.slice(0, 200)}`);
      }

      return NextResponse.json({
        food,
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        items: items.map((it) => ({
          name: it.name.trim(),
          portion: typeof it.portion === 'string' ? it.portion : undefined,
          calories: Math.round(num(it.calories)),
          protein: Math.round(num(it.protein)),
          carbs: Math.round(num(it.carbs)),
          fat: Math.round(num(it.fat)),
        })),
        confidence: Math.min(1, Math.max(0, num(analysis.confidence) || 0.5)),
        remaining: quota.remaining,
      });
    } catch (error) {
      // AI failed after we took a quota unit — give it back and log why.
      await quota.refund();
      console.error('[POST /api/vision] AI call failed', { model: VISION_MODEL, mode: analysisMode, reason: describeAiError(error) });
      return NextResponse.json({ error: 'Image analysis failed' }, { status: 502 });
    }
  } catch (error) {
    console.error('[POST /api/vision]', error);
    return NextResponse.json({ error: 'Image analysis failed' }, { status: 500 });
  }
}
