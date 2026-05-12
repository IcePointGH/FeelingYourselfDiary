# 05 - AI 对话自动标题

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

新对话首次完成后，异步调用 MiniMax 生成 ≤15 字的对话标题，自动更新 session。

**后端：**

`AiChatService` 新增 `generateTitle(sessionId)` （`@Async`）：
- 触发条件：session.title == "新对话" 且已完成首轮对话（至少 1 条 user + 1 条 assistant）
- 获取首轮对话的 user message + assistant response
- 构建 prompt：`"用不超过15个字总结以下对话的主题，只返回标题，不要其他内容。\n\n用户：{userMsg}\n助手：{assistantMsg}"`
- 调用 `ChatClient.builder(chatModel).build().prompt().user(prompt).call().content()`
- 用 trim() 清理结果，确保 ≤15 字（截断 + 省略号）
- 调用已有 `AiSessionService.renameSession(id, title)`
- 失败时静默处理（保留默认标题），LOG.warn

**前端：**

- 侧边栏 `SessionSidebar` - 新创建 session 标题显示"新对话（标题生成中…）"
- 首次对话完成后 → 新增轮询/事件：每秒检查 session 标题是否已变化
- 标题生成完成 → 自动刷新侧边栏显示新标题
- 简化方案：每次 SSE 流结束后重新请求 session list，标题自然更新

## Acceptance criteria

- [ ] 新对话"新对话"发送首条消息 → AI 回复完成后自动生成标题
- [ ] 自动标题 ≤15 字，准确反映对话主题
- [ ] 标题生成失败时不阻塞聊天，保留默认"新对话"
- [ ] 侧边栏标题在 1-2 秒内自动更新为生成的新标题
- [ ] 已有自定义标题的 session 不触发自动标题（幂等）
- [ ] `generateTitle()` 方法单元测试：mock ChatClient，验证 prompt 构建 + 结果截断

## Blocked by

None - can start immediately
