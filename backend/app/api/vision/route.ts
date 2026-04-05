import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY?.trim();
const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';

interface VisionResponse {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { image, lang, mode } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: '缺少图片数据' },
        { status: 400 }
      );
    }

    if (!FIREWORKS_API_KEY) {
      return NextResponse.json(
        { error: 'Fireworks API key 未配置' },
        { status: 500 }
      );
    }

    // Build language-specific prompt
    const langPromptMap: Record<string, string> = {
      'zh-CN': '请用简体中文命名食物。',
      'zh-TW': '請用繁體中文命名食物。',
      'ja-JP': '食べ物の名前は日本語で記載してください。',
      'ko-KR': '음식 이름을 한국어로 작성해주세요.',
      'en-US': 'Name the food in English.',
    };
    const langInstruction = langPromptMap[lang] ?? langPromptMap['en-US'];

    // Build prompt based on mode
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

    // 调用 Fireworks AI Vision 模型
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
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
              {
                type: 'text',
                text: promptText,
              },
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
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    
    // 尝试解析 JSON 响应
    let analysis: VisionResponse;
    try {
      // 移除可能的 markdown 代码块标记
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      // 如果解析失败，返回默认值
      console.error('Failed to parse AI response:', content);
      analysis = {
        food: 'Unknown food',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        confidence: 0.5,
      };
    }

    // 验证返回的数据
    if (!analysis.food || typeof analysis.calories !== 'number') {
      return NextResponse.json(
        { error: 'AI 返回的数据格式不正确' },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { error: error.message || '分析图片失败' },
      { status: 500 }
    );
  }
}


