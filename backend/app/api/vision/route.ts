import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
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
    const { image } = await request.json();

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

    // 调用 Fireworks AI Vision 模型
    const response = await axios.post(
      FIREWORKS_API_URL,
      {
        model: 'accounts/fireworks/models/qwen2-vl-7b-instruct',
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
                text: `请分析这张食物图片，返回 JSON 格式：
{
  "food": "食物名称（中文）",
  "calories": 卡路里数值（数字）,
  "protein": 蛋白质克数（数字）,
  "carbs": 碳水化合物克数（数字）,
  "fat": 脂肪克数（数字）,
  "confidence": 置信度（0-1之间的数字）
}

请只返回 JSON，不要其他文字。`,
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
        food: '未知食物',
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


