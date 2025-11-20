# 快速启动指南

## 前置要求

- Node.js 18+ 
- npm 或 yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase 账号
- Fireworks AI 账号

## 步骤 1: 设置 Supabase 数据库

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目 Dashboard 中，进入 SQL Editor
3. 复制 `supabase/schema.sql` 的内容并执行
4. 在 Settings > API 中获取：
   - Project URL
   - `anon` public key
   - `service_role` secret key

## 步骤 2: 配置后端

```bash
cd backend
npm install
cp .env.example .env
```

编辑 `backend/.env`，填入：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREWORKS_API_KEY` (从 [Fireworks AI](https://fireworks.ai) 获取)

启动后端：
```bash
npm run dev
```

后端将在 `http://localhost:3000` 运行

## 步骤 3: 配置前端

在项目根目录：

```bash
npm install
```

创建 `.env` 文件（或直接在代码中修改）：
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

如果使用真机测试，需要将 `localhost` 替换为你的电脑 IP 地址。

## 步骤 4: 添加资源文件

在 `assets/` 目录下添加：
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024) 
- `splash-icon.png` (1024x1024)
- `favicon.png` (48x48)

可以使用在线工具生成，或使用 Expo 的默认图标。

## 步骤 5: 运行前端

```bash
npm start
```

然后：
- 按 `i` 在 iOS 模拟器运行
- 按 `a` 在 Android 模拟器运行
- 扫描二维码在真机上运行

## 步骤 6: 测试功能

1. **拍照识别**：进入"记录"页面，拍照或选择图片，点击"分析食物"
2. **查看数据**：在"今日"页面查看今日卡路里和健康数据
3. **数据统计**：在"数据"页面查看图表和统计

## 常见问题

### 1. 健康数据无法读取
- iOS: 确保在 `app.json` 中配置了 HealthKit 权限
- Android: 确保已安装 Google Fit 并授权

### 2. API 调用失败
- 检查后端是否运行
- 检查 `.env` 配置是否正确
- 检查网络连接

### 3. 图片识别失败
- 确保 Fireworks API key 正确
- 检查图片格式（支持 JPEG, PNG）
- 查看后端日志获取详细错误信息

## 部署

### 后端部署到 Vercel

```bash
cd backend
vercel
```

### 前端构建

```bash
# iOS
eas build --platform ios

# Android  
eas build --platform android
```

## 下一步

- [ ] 实现用户认证
- [ ] 添加图片上传到 Supabase Storage
- [ ] 优化 AI 识别准确度
- [ ] 添加更多健康指标
- [ ] 实现数据导出功能


