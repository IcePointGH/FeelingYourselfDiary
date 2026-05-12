# 03 - 全历史分析 — 后端核心

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

新增 Mode 3「全历史分析」的后端引擎：异步分块处理 + 进度追踪。

**Session 状态机：**

```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED
```

在 `AiSession` 实体新增字段：`status`（枚举 PENDING/PROCESSING/COMPLETED/FAILED）、`progress`（0-100）、`resultSummary`（TEXT）。更新 `ai_sessions` 表（JPA ddl-auto 自动处理）。

**核心服务：**

1. **HistoryChunkingService**（深度模块 — 纯函数，可单元测试）
   - 输入：全部 Schedule 列表 + Diary 列表 + maxTokens（3000）
   - 输出：`List<Chunk>`，每个 Chunk 包含 schedules + diaries 子集
   - Token 估算策略：中文约 1.5 字符/1 token，含安全余量
   - 边界处理：空数据、单 chunk、超大溢出

2. **AiAnalysisService.analyzeFullHistory(sessionId)** — `@Async` 异步执行
   - 查询用户全部 schedules + diaries
   - 调用 HistoryChunkingService 分块
   - 逐块调用 MiniMax 分析（串行，避免并发超 API 限制）
   - 每块完成后更新 session.progress
   - 全部完成后调用 MiniMax 做汇总分析
   - 结果写入 session messages 列表，status → COMPLETED
   - 异常 → status → FAILED，写入错误信息

**API：**
- `POST /api/ai/sessions` 支持 `sessionType: "full"` → 创建 PENDING 状态 session，异步启动分析
- `GET /api/ai/sessions/{id}` 返回 status + progress 字段（已有端点扩展）

**Spring Async 配置：**
- `@EnableAsync` + `ThreadPoolTaskExecutor`（core=2, max=2, queue=10）
- 复用已有 `ChatClient` bean（MiniMax 连接）

**测试：**
- `HistoryChunkingService` 单元测试（empty / single / overflow / mixed 场景）
- `AiAnalysisService` 单元测试（mock chunking + mock ChatClient）

## Acceptance criteria

- [ ] `POST /api/ai/sessions {sessionType: "full"}` 创建 session 返回 id + status=PENDING
- [ ] 分析异步启动后，`GET /api/ai/sessions/{id}` 显示 progress 逐步推进
- [ ] 100% 数据 chunk 正确分块并全部调用 MiniMax（验证消息记录数 = chunks × 2）
- [ ] 分析完成后 session messages 包含完整 markdown 结果
- [ ] 空数据用户 → ChunkingService 返回空列表 → 返回"暂无数据"友好提示
- [ ] MiniMax 调用失败 → status=FAILED，前端可感知
- [ ] HistoryChunkingService 单元测试通过（≥5 个场景）
- [ ] AiAnalysisService 单元测试通过（正常流程 + 失败回退）
- [ ] 后端 121 项已有测试无回归

## Blocked by

None - can start immediately
