# 08 - 对话记忆系统 — 用户画像持久化

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

为"小七"AI 助手增加**长期记忆能力**：后台维护一份用户画像 Markdown 文档，每 5 轮完整对话交换后异步分析并更新画像。每次新会话创建时将画像注入 system prompt，使 AI 能基于用户历史持续个性化。

### 数据模型

新建 `user_memory` 表：
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT PK | 主键 |
| user_id | BIGINT NOT NULL UNIQUE | 用户 ID |
| content | TEXT | 记忆文档内容（Markdown） |
| version | INT DEFAULT 0 | 版本号（乐观锁） |
| exchange_count | INT DEFAULT 0 | 累计交换轮数（0-4 后触发分析重置为 0） |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 记忆画像结构

```
## 用户画像

### 情绪特征
- 整体模式：波动/稳定/偏负面/偏正面
- 最近变化趋势

### 关注主题
- 反复提及的话题分类（工作、人际、健康、成长等）

### 沟通偏好
- 喜欢的回复风格（简洁直接/温柔共情/幽默轻松）

### 特别提醒
- 未解决的问题、用户表达过的特别需求、值得 follow-up 的话题
```

### 触发机制

- 每次 `AiChatService.chat()` 完成后，更新 `exchange_count`（用户+AI 各一条 = 1 轮）
- `exchange_count >= 5` 时：触发异步分析 `@Async updateMemory(userId)`
- 分析过程：
  1. 取该用户**最近 5 轮对话**的消息内容
  2. 取当前记忆文档 `content`（如果存在）
  3. 构建 prompt：「旧画像 + 新对话 → 更新画像」
  4. 调用 MiniMax 生成新画像
  5. 全量覆盖 `content`，`exchange_count` 重置为 0

### 加载机制

- 新会话创建时（`AiSessionService.createSession()` 或 `AiChatService.chat()` 首次）：
  - 查询 `user_memory` 表
  - 如果存在且 content 非空，追加到 system prompt 末尾：
    ```
    ## 关于用户（基于历史对话分析）
    {记忆文档内容}
    ```
- 已有会话的后续消息**不重复注入**（sliding window 已包含）

### API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/ai/memory` | 查看当前用户画像（调试用） |
| DELETE | `/api/ai/memory` | 清除记忆（重置） |

## Acceptance criteria

- [ ] `user_memory` 表创建成功，JPA 实体验证通过
- [ ] 新用户首次聊天 → exchange_count 从 0 累加
- [ ] 用户完成 5 轮交换 → 自动触发异步分析，画像写入 content
- [ ] 新画像包含 4 个结构化部分（情绪/主题/偏好/提醒）
- [ ] 创建新会话时，system prompt 包含用户画像
- [ ] 已有画像的用户 → 第 6 次交换时基于旧画像+新对话更新（不为空）
- [ ] `DELETE /api/ai/memory` 清除记忆后，下次对话恢复无记忆状态
- [ ] `exchange_count` 在分析后正确重置为 0，下个周期重新计数
- [ ] 异步分析失败不影响聊天正常响应（静默降级）
- [ ] 136 项已有测试无回归

## Blocked by

None - can start immediately
