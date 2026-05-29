# Lock — AI Office 自动化

## 项目概述
AI 驱动的办公室自动化工具，帮助团队/个人用 AI 处理日常办公任务，提升效率。

## Tech Stack
| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| AI   | Anthropic Claude API |
| 数据库 | PostgreSQL + Prisma |
| 认证 | Clerk |

## 目录结构
```
Lock/
├── app/           # Next.js 页面和 API routes
├── components/    # UI 组件
├── lib/           # 工具函数、AI 封装
├── prisma/        # 数据库 schema
└── types/         # TypeScript 类型定义
```

## 编码规范
- 语言: TypeScript，严格模式
- AI 调用: 统一通过 `lib/claude.ts` 封装，不要直接在组件里调用 API
- 错误处理: 所有 API route 必须有 try/catch 和合理的错误响应
- 命名: 组件 PascalCase，API route handler camelCase

## Commit 格式
```
feat(module): 简短描述
fix(api): 简短描述
refactor(lib): 简短描述
```

## 完成任务后必做
1. 运行 `npm run lint` 并修复所有 error
2. 确认新的 API route 有正确的类型定义
3. 在 issue 评论中输出: `DONE: <一句话总结做了什么>`

## 重要约束
- Claude API key 只放在服务端，不要暴露到客户端
- 所有涉及用户数据的操作必须先验证 Clerk session
- 不要在数据库查询中使用 `findMany` 没有 `take` 限制（防止全表扫描）
- 新功能必须考虑加载状态和错误状态的 UI
