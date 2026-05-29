import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, ImageMediaType } from '@/lib/claude';

interface VisionResponse {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

const VISION_PROMPT = `请分析这张食物图片，返回 JSON 格式：
{
  "food": "食物名称（中文）",
  "calories": 卡路里数值（数字）,
  "protein": 蛋白质克数（数字）,
  "carbs": 碳水化合物克数（数字）,
  "fat": 脂肪克数（数字）,
  "confidence": 置信度（0-1之间的数字）
}

请只返回 JSON，不要其他文字。`;

const FALLBACK: VisionResponse = { food: '未知食物', calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0.5 };

export async function POST(request: NextRequest) {
  try {
    const { image, mediaType = 'image/jpeg' } = await request.json();

    if (!image) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }

    const result = await analyzeImage(image, mediaType as ImageMediaType, VISION_PROMPT, undefined, {
      maxTokens: 500,
      temperature: 0,
    });

    let analysis: VisionResponse;
    try {
      const jsonContent = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonContent);
    } catch {
      console.error('Failed to parse Claude vision response:', result.content);
      analysis = FALLBACK;
    }

    if (!analysis.food || typeof analysis.calories !== 'number') {
      return NextResponse.json({ error: 'AI 返回的数据格式不正确' }, { status: 500 });
    }

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '分析图片失败';
    console.error('Vision API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
