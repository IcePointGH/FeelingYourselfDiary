# PRD: AI 情绪分析 Phase 2 — 全历史分析 · 速率限制 · 自动标题 · 前端打磨 · 生产加固

**Status:** Ready for Implementation  
**Triage:** ready-for-agent  
**Created:** 2026-05-12  
**Depends on:** Phase 1 (Modes 1 & 2 completed — see conversation context)

---

## Problem Statement

Phase 1 实现了 AI 情绪分析的基础能力：时间范围分析（Mode 2）和 SSE 流式聊天（Mode 1）。但当前系统存在以下不足：

1. **无法分析完整历史** —— 用户只能选择日期范围手动分析，无法一键获取全量数据的深度洞察。由于 Token 预算限制（4096），大量历史数据需要分块处理。
2. **无调用频率控制** —— 任何用户可无限制调用 MiniMax API，存在成本失控风险。
3. **会话标题无意义** —— 新对话默认标题"新对话"，用户需手动重命名，体验差。
4. **前端粗糙** —— AI 页面移动端布局挤压，空状态缺失，无加载骨架。
5. **生产配置松散** —— CORS 开放度过高，`ddl-auto=update` 存在生产风险。

## Solution

在 Phase 1 基础上完成以下增强：

1. **全历史分析（Mode 3）**：异步任务模式，分块处理超 Token 限制的数据，通过 session 状态追踪进度，用户可查看分析进度并在完成后查看结果。
2. **速率限制中间件**：基于 Redis 的请求计数器，每日每用户上限 50 次，超限返回 429，前端友好提示。
3. **AI 自动标题**：首次对话完成后异步调用 MiniMax 生成对话标题，更新 session title。
4. **前端体验打磨**：移动端响应式布局 + 空状态插图 + 会话列表加载骨架。
5. **生产配置加固**：CORS 白名单限制、`ddl-auto` 改为 `validate`。

## User Stories

### Mode 3: 全历史分析
1. As a user, I want to trigger a full-history emotional analysis with one click, so that I can understand my emotional patterns across all my recorded data without manually selecting date ranges.
2. As a user, I want to see real-time progress of the analysis (e.g., "正在分析第 3/5 批..."), so that I know the system is working and how long to wait.
3. As a user, I want the analysis result to be persisted in a session and viewable after page refresh, so that I don't lose the analysis if I accidentally close the page.
4. As a user, I want the system to handle large amounts of historical data gracefully (chunking when token limit is exceeded), so that I always get a complete analysis regardless of how much data I have.
5. As a user, I want to be notified when the full-history analysis completes, so that I can switch tabs and immediately see the results.

### Rate Limiting
6. As a system operator, I want to limit each user to 50 AI calls per day, so that API costs remain predictable and fair across users.
7. As a user approaching my daily limit, I want to see my remaining quota, so that I can ration my usage throughout the day.
8. As a user who has hit the rate limit, I want a clear message telling me when my quota resets, so that I know when I can use the AI feature again.

### AI Auto-Title
9. As a user, I want the chat session title to be automatically generated based on my first conversation, so that I can distinguish between multiple sessions without manually naming each one.
10. As a user, I want the auto-title to be concise (max 15 characters) and reflect the conversation theme, so that I can quickly scan my session list.
11. As a user, I want the title to fallback gracefully to the default "新对话" if auto-generation fails, so that I'm never left with an empty or broken title.

### Frontend Polish
12. As a mobile user, I want the AI page to be fully usable on a phone screen, so that I can chat and analyze on the go.
13. As a user with no AI sessions, I want to see a friendly empty state with guidance, so that I know how to start using the AI feature.
14. As a user on a slow network, I want to see loading skeletons while sessions load, so that I know the page is working.
15. As a user, I want the session sidebar to collapse on mobile and be toggleable, so that chat has maximum screen space when I need it.

### Production Hardening
16. As a system operator, I want CORS restricted to known origins only, so that unauthorized domains cannot call the API.
17. As a system operator, I want the database schema to be explicitly managed (not auto-updated), so that production schema changes are intentional and reviewed.

## Implementation Decisions

### Module 1: Full-History Deep Analysis (Mode 3)

**Overview:** New analysis mode that processes ALL user data through MiniMax in a single session. Due to token constraints, large datasets are split into chunks. Processing is asynchronous with progress tracking via session status.

**Session State Machine:**
```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED
```
- `status` field on `ai_sessions` table (enum: PENDING, PROCESSING, COMPLETED, FAILED)
- `progress` field: integer 0-100
- `result_summary` field: holds the final compiled analysis markdown

**Data Flow:**
1. `POST /api/ai/sessions` with `sessionType: "full"`
2. Backend creates session with status=PENDING, progress=0
3. `AiAnalysisService.analyzeFullHistory(sessionId)` runs async (`@Async`)
4. Service fetches ALL schedules + diaries for user, calculates token estimate
5. If total tokens ≤ 3000 → single call. If > 3000 → chunked calls
6. Per chunk: prompt includes partial data, appends result to accumulator
7. After all chunks → summary call to MiniMax to synthesize findings
8. Final result written to session messages, status=COMPLETED
9. Frontend polls `GET /api/ai/sessions/{id}` for status

**Chunking Strategy (HistoryChunkingService):**
- Pure function: `List<Chunk> chunk(List<Schedule>, List<Diary>, int maxTokens)`
- Estimates tokens using MiniMax tokenizer (character-based fallback if unavailable)
- Each chunk = subset of schedules + corresponding diary text
- Max 3000 tokens per chunk (leaving 1096 for system prompt + response)

**Progress Tracking:**
- `AiSession.progress` updated after each chunk completes
- Progress = (chunks_completed / total_chunks) * 100
- Frontend shows progress bar during analysis
- On completion, SSE stream of result or direct append to messages

**API Contracts:**
```
POST /api/ai/sessions
Request:  { "sessionType": "full" }
Response: { "id": long, "status": "PENDING" }

GET /api/ai/sessions/{id}
Response: includes { "status", "progress", "messages" }
```

**Frontend Interactions:**
- "全历史分析" button on AI page Mode 3 tab
- After triggering: progress bar + status text replaces button
- On completion: chat bubble with full analysis markdown
- Result persisted — survives page refresh (fetched from session messages)

### Module 2: Rate Limiting

**Overview:** Redis-based sliding window rate limiter. Pure infrastructure — no business logic coupling.

**Deep Module: RateLimitService**
```java
public interface RateLimitService {
    /**
     * Try to acquire a permit for the given action.
     * @return true if permitted, false if rate limited
     */
    boolean tryAcquire(Long userId, String action, int maxPerWindow, Duration window);
    
    /**
     * Get remaining permits for the current window.
     * @return remaining count, or -1 if key doesn't exist (no calls made yet)
     */
    long getRemaining(Long userId, String action, int maxPerWindow, Duration window);
}
```

**Key Design:**
- Redis key pattern: `ratelimit:{userId}:{action}:{windowKey}` (e.g., `ratelimit:1:ai_call:2026-05-12`)
- TTL on key = window duration (auto-expires at end of day)
- Atomic increment via `INCR` + `EXPIRE` (Lua script for atomicity)
- Action types: `ai_chat`, `ai_analyze`, `ai_full` (can be sub-grouped under `ai_call`)

**Integration Point:**
- `RateLimitInterceptor` (Spring HandlerInterceptor) — runs before controller
- Applied to `/api/ai/**` paths
- Header response: `X-RateLimit-Remaining: N`, `X-RateLimit-Reset: timestamp`
- On limit: `ApiResponse(429, "今日调用次数已达上限（50次），请明天再试")`

**Frontend Behavior:**
- Intercept 429 in `useApi.ts` → show toast with reset time
- Optional: show remaining quota in AI page header

### Module 3: AI Auto-Title

**Overview:** After first complete chat exchange (user message + AI response), asynchronously generate a concise title.

**Flow:**
1. User sends first message in chat session
2. AI responds via SSE (existing flow)
3. After `doOnComplete` saves assistant message → check if session.title == "新对话"
4. If yes → async call `generateTitle(sessionId)` 
5. Build prompt: "用不超过15个字总结以下对话的主题：\n用户：{firstUserMsg}\n助手：{firstAssistantMsg}"
6. Parse response → `aiSessionService.renameSession(id, title)`
7. Error → keep default title, log warning

**Implementation:**
- `AiChatService.generateTitle()` — separate method, `@Async`
- Reuses existing `ChatClient` bean
- No new endpoints — existing `PUT /api/ai/sessions/{id}` handles rename
- Frontend: title auto-updates in sidebar via polling or WebSocket (simplest: refetch session list after title change)

**Frontend Handling:**
- After first exchange, session title in sidebar shows "生成标题中..." briefly
- Title updates automatically when backend rename completes
- Simple approach: sidebar refetches session list after each chat message completes (incremental polling)

### Module 4: Frontend Polish

**Mobile Responsive Layout:**
- Session sidebar: collapses to hamburger menu on < 768px
- Chat bubbles: full-width on mobile, max-width on desktop
- Date range picker: vertical stack on mobile
- Touch-friendly button sizes (> 44px tap targets)

**Empty States:**
- No sessions: illustration + "开始你的第一次AI对话" + "新建对话" button
- No messages in session: "发送第一条消息开始对话"
- No analysis result: placeholder with instructions

**Loading Skeletons:**
- Session list loading: 3-4 skeleton cards (pulsing gray)
- Chat loading: skeleton bubbles

**Implementation:**
- CSS Modules media queries (no Tailwind — project convention)
- `EmptyState` component (reusable)
- `Skeleton` component (reusable, with `width`, `height`, `variant` props)

### Module 5: Production Hardening

**CORS Lockdown:**
- Replace `allowedOriginPatterns("*")` with explicit origins
- Environment variable: `CORS_ORIGINS` (comma-separated, defaults to `http://localhost:3000,https://sevensense.art`)
- Apply to `SecurityConfig`

**Database Schema:**
- `spring.jpa.hibernate.ddl-auto` change: `update` → `validate`
- Requires pre-deployment migration script for any schema changes
- JPA entities must match production schema exactly

**Not in this PRD (moved to separate task):**
- JWT httpOnly cookie migration (auth refactor, orthogonal to AI feature)
- BCrypt strength increase

## Testing Decisions

**What makes a good test:**
- Test external behavior, not implementation details
- Backend: pure Mockito unit tests (no Spring context — follow existing convention, 121 tests)
- Mock external dependencies (MiniMax API, repositories)
- Verify contracts: correct DTO transformations, proper exception mapping, state transitions

**Modules to test:**

| Module | Test Scope | Approach |
|---|---|---|
| `RateLimitService` | Unit test | Mock Redis operations (RedissonClient), verify count/decrement/expiry logic |
| `HistoryChunkingService` | Unit test | Pure function — test edge cases: empty input, single chunk, large overflow, mixed data |
| `AiAnalysisService` (full history) | Unit test | Mock chunking service + MiniMax chat model, verify chunk orchestration + progress updates |
| `AiChatService` (auto-title) | Unit test | Mock ChatClient, verify title generation trigger condition + error fallback |
| `AiSessionService` (extended) | Unit test | Verify status transitions valid (PENDING→PROCESSING→COMPLETED, no invalid transitions) |

**Prior art:**
- Existing tests in `backend/src/test/` follow Mockito + JUnit 5 pattern
- Example patterns: mocking repository with `when().thenReturn()`, verifying service method calls, testing DTO mappings
- No Spring context loading — pure unit tests

## Out of Scope

- JWT → httpOnly Cookie migration (existing TODO, orthogonal to AI feature)
- BCrypt strength increase from 10 to 12
- AI model switch or provider abstraction
- Multi-language support
- Session export/share functionality
- Chat message reactions or threading
- User feedback on AI response quality
- Admin dashboard for AI usage analytics

## Further Notes

- **Token Budget:** MiniMax-M2.7 supports 4096 tokens. System prompt ~150 tokens, response allocation ~1000 tokens. Leaves ~2900 tokens for user data. At ~60 tokens per schedule + ~100 per diary, this supports ~40 schedules or ~15 schedules + 10 diaries per chunk.
- **Async Processing:** Spring `@Async` with `ThreadPoolTaskExecutor`. Configure pool size=2, queue capacity=10 to limit concurrent MiniMax calls.
- **Session Cleanup:** Consider adding a scheduled task to clean up abandoned PENDING/PROCESSING sessions (older than 24h → mark FAILED).
- **Cost Estimation:** At MiniMax-M2.7 pricing, full-history analysis of 1 year of data (~365 schedules + 100 diaries) requires ~10 chunks → ~10 API calls. At ¥0.002/1K tokens, approximate cost ¥0.05-0.10 per full analysis.
- **Docker-compose:** Redis already configured — rate limiting needs no infra changes.
- **Migration:** `ddl-auto=validate` change requires all JPA entities to perfectly match schema. Run with `validate` in dev first before production.
