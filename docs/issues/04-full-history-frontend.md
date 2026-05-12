# 04 - 全历史分析 — 前端界面

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** #03 全历史分析后端核心

---

## What to build

Mode 3「全历史分析」的前端交互界面，对接后端异步分析 API。

**Mode 3 Tab：**
- 在 AI.tsx 模式切换中添加第三个 tab「全历史分析」
- 未触发分析时：展示说明文字 + "开始全历史分析"按钮
- 点击按钮 → `POST /api/ai/sessions {sessionType: "full"}` → 获取 sessionId

**进度展示：**
- 分析进行中：按钮替换为进度条（0-100%）+ 状态文本（"正在分析第 3/5 批数据…"）
- 通过轮询 `GET /api/ai/sessions/{sessionId}`（3 秒间隔）获取 progress
- 进度条到达 100% 后等待后端 status=COMPLETED

**结果展示：**
- 分析完成：进度条消失 → 显示完整聊天气泡（markdown 渲染，复用 react-markdown）
- 结果持久化：从 session messages 中读取 → 页面刷新后仍可见
- 失败：显示错误信息 + "重新分析"按钮

**UI 细节：**
- 进度条样式：品牌色渐变，带脉冲动画
- Tab 切换时保持分析进度（不中断轮询）
- 已完成的"全历史分析" session 出现在侧边栏会话列表中

## Acceptance criteria

- [ ] Mode 3 tab 可切换，"开始全历史分析"按钮可见
- [ ] 点击按钮后请求发送，进度条 + 状态文本出现
- [ ] 进度条实时更新（3s 轮询），百分比递增
- [ ] 分析完成后进度条消失，结果以 markdown 气泡展示
- [ ] 刷新页面后结果仍存在（从 session messages 读取）
- [ ] 分析失败时显示错误提示 + "重新分析"按钮
- [ ] 完成的 full 类型 session 出现在侧边栏，可点击查看历史结果
- [ ] 切换到其他 tab 再切回，进度条/结果状态保持
- [ ] 空数据用户 → 友好提示"当前暂无数据可分析"

## Blocked by

- #03 全历史分析 — 后端核心
