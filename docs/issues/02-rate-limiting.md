# 02 - AI 调用速率限制

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

基于 Redis 的每日调用频率限制，防止 API 成本失控。

**后端（深度模块 RateLimitService）：**

Redis 键设计：`ratelimit:{userId}:ai_call:{yyyy-MM-dd}`，每日每用户上限 **50 次**。使用 Lua 脚本保证 INCR + EXPIRE 原子性。窗口到期自动过期。

Spring `HandlerInterceptor` 拦截 `/api/ai/**` 路径，注入 `RateLimitService`：
- 未超限 → 放行，响应头注入 `X-RateLimit-Remaining: N`、`X-RateLimit-Reset: timestamp`
- 超限 → 返回 `ApiResponse(429, "今日调用次数已达上限（50次），请明天再试")`，响应头包含 `Retry-After`

RateLimitService 需写纯 Mockito 单元测试（mock RedissonClient）。

**前端：**

`useApi.ts` 新增 429 拦截：提取 `Retry-After` 响应头，在 Toast 中提示下次可用时间。AI 页面顶部显示当日剩余配额（调用 `GET /api/ai/quota` 或复用 429 响应头信息）。

## Acceptance criteria

- [ ] 正常调用时 API 正常返回，`X-RateLimit-Remaining` 递减
- [ ] 第 51 次调用返回 429 + `Retry-After` 响应头
- [ ] Redis 键 TTL 正确（每日自动重置）
- [ ] 前端收到 429 后展示 Toast："今日 AI 调用次数已用完，请明天再试"
- [ ] 前端 AI 页面显示剩余配额（如"今日剩余 43/50 次"）
- [ ] RateLimitService 单元测试通过（覆盖：首次调用、递增、超限、跨天重置）
- [ ] 后端 121 项已有测试无回归

## Blocked by

None - can start immediately
