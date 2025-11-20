# Cal AI - 卡路里识别 App

一个基于 AI 的智能卡路里识别应用，支持拍照识别食物并自动计算营养成分。

## 技术栈

### 前端
- **React Native** + **Expo** - 跨平台移动应用框架
- **Expo Router** - 文件系统路由
- **Zustand** - 状态管理
- **NativeWind** - Tailwind CSS for React Native
- **Victory Native** - 数据可视化图表
- **react-native-health** - Apple Health & Google Fit 集成

### 后端
- **Next.js** - React 全栈框架
- **Supabase** - PostgreSQL 数据库和认证
- **Fireworks AI** - Vision 模型用于食物识别

## 项目结构

```
.
├── app/                    # Expo Router 应用目录
│   ├── (tabs)/            # Tab 导航页面
│   │   ├── today.tsx      # 今日页面
│   │   ├── log.tsx        # 记录页面（拍照识别）
│   │   ├── dashboard.tsx  # 数据统计页面
│   │   ├── profile.tsx    # 个人资料页面
│   │   └── settings.tsx  # 设置页面
│   └── _layout.tsx        # 根布局
├── store/                 # Zustand 状态管理
│   └── useStore.ts
├── services/              # 服务层
│   ├── api.ts            # API 调用
│   └── health.ts         # 健康数据集成
├── backend/               # Next.js 后端
│   ├── app/
│   │   └── api/          # API 路由
│   │       ├── vision/   # 食物识别 API
│   │       ├── log-meal/ # 记录餐食 API
│   │       ├── today/    # 今日数据 API
│   │       └── weekly/   # 周数据 API
│   └── lib/
│       └── supabase.ts   # Supabase 客户端
└── supabase/
    └── schema.sql        # 数据库 Schema
```

## 快速开始

### 1. 前端设置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 2. 后端设置

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 Supabase 和 Fireworks AI 密钥

# 启动开发服务器
npm run dev
```

### 3. 数据库设置

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中运行 `supabase/schema.sql` 创建表结构
3. 获取项目 URL 和 API 密钥，填入后端 `.env` 文件

### 4. 配置 Fireworks AI

1. 在 [Fireworks AI](https://fireworks.ai) 注册账号
2. 获取 API 密钥
3. 填入后端 `.env` 文件的 `FIREWORKS_API_KEY`

### 5. 环境变量

#### 前端 (.env 或 app.json)
```env
EXPO_PUBLIC_API_URL=https://your-nextjs-app.vercel.app
```

#### 后端 (.env)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FIREWORKS_API_KEY=your_fireworks_api_key
```

## 功能特性

### ✅ 已实现
- [x] 5 个 Tab 导航页面
- [x] 拍照/选择图片识别食物
- [x] AI 识别食物并返回营养成分
- [x] 记录餐食到数据库
- [x] 今日卡路里统计
- [x] 数据可视化图表
- [x] Apple Health 集成（iOS）
- [x] Google Fit 集成（Android）
- [x] 健康数据同步

### 🔄 待完善
- [ ] 用户认证系统
- [ ] 图片上传到 Supabase Storage
- [ ] 更详细的营养分析
- [ ] 历史数据查看
- [ ] 目标设置和提醒

## API 端点

### POST /api/vision
分析食物图片，返回营养成分

**请求体:**
```json
{
  "image": "base64_encoded_image"
}
```

**响应:**
```json
{
  "food": "苹果",
  "calories": 95,
  "protein": 0.5,
  "carbs": 25,
  "fat": 0.3,
  "confidence": 0.95
}
```

### POST /api/log-meal
记录餐食

**请求体:**
```json
{
  "food_name": "苹果",
  "calories": 95,
  "protein": 0.5,
  "carbs": 25,
  "fat": 0.3,
  "image_url": "https://..."
}
```

### GET /api/today
获取今日数据

**响应:**
```json
{
  "totalCalories": 2000,
  "meals": [...]
}
```

### GET /api/weekly
获取周数据

**响应:**
```json
{
  "calories": [1800, 2200, ...],
  "protein": [120, 150, ...],
  "carbs": [200, 250, ...],
  "fat": [60, 80, ...]
}
```

### POST /api/sync-health
同步健康数据

**请求体:**
```json
{
  "steps": 10000,
  "active_energy": 500,
  "heart_rate": 72
}
```

## 部署

### 前端
使用 Expo 部署到 App Store 和 Google Play：
```bash
eas build --platform ios
eas build --platform android
```

### 后端
部署到 Vercel：
```bash
cd backend
vercel deploy
```

## 注意事项

1. **健康数据权限**: iOS 需要在 `app.json` 中配置 HealthKit 权限说明
2. **API 密钥**: 确保所有 API 密钥都安全存储，不要提交到 Git
3. **用户认证**: 当前版本使用简化的用户 ID，生产环境需要实现完整的认证系统
4. **图片存储**: 当前图片 URL 为本地路径，生产环境应上传到 Supabase Storage

## 许可证

MIT


