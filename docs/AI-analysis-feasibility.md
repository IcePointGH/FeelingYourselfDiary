# AI 情绪分析 — 可行性分析 & 阶段规划

**创建时间:** 2026-05-11
**状态:** Phase 0 — 可行性验证
**关联需求:** 三种AI分析模式（自由对话 / 时间区间 / 全历史分块）

---

## 0. 已确认决策

| # | 决策点 | 确认结果 |
|---|--------|----------|
| 1 | **LLM 提供商** | **MiniMax-2.7M**（`spring-ai-starter-model-minimax`） |
| 2 | **API Key** | 先用占位符，用户后期自行配置到 `.env` |
| 3 | **商业模式** | 完全开源免费，无商业用途 — 无需成本追踪 |
| 4 | **持久化** | MySQL 持久化，需三张表：`ai_sessions` + `ai_messages` + `ai_session_schedules`（关联表） |
| 5 | **会话独立性** | 每次会话历史完全独立，不跨会话共享上下文 |
| 6 | **会话内记忆** | 同一会话内通过滑动窗口保留最近 N 轮对话记忆 |
| 7 | **日记文本** | ✅ 日记 `content` 纳入AI分析（模式2/3 将日程+日记一并传入） |
| 8 | **隐私同意** | ✅ 首次使用时弹窗告知"数据将被发送到 MiniMax 进行分析" |
| 9 | **AI 角色** | **情绪平衡助手** — 善于理解情绪波动，给出分析、建议和安慰 |
| 10 | **页面位置** | **独立页面** `/ai` — 更自由的UI布局 + 会话切换侧边栏 |

---

## 1. 可行性评估

### 总体结论：✅ 可行，但需分阶段实施

| 维度 | 评估 | 说明 |
|------|------|------|
| **后端框架兼容性** | ⚠️ 需验证 | Spring AI 2.0.0-M6 支持 Spring Boot 4.x，但仍是里程碑版本（非GA） |
| **LLM中文支持** | ✅ 优秀 | MiniMax 一等公民支持（`spring-ai-starter-model-minimax`） |
| **流式响应(SSE)** | ✅ 就绪 | Spring AI `Flux<String>` + Spring WebFlux SSE |
| **会话持久化** | ✅ 就绪 | 自建三张实体表：`ai_sessions` + `ai_messages` + `ai_session_schedules` |
| **会话内记忆** | ✅ 就绪 | 滑动窗口：查询最近 N 条消息构建上下文，超出自动排除 |
| **分块分析（模式3）** | ⚠️ 需自建 | Spring AI 无内置分块管道，需自定义 Advisor + Async |
| **异步处理** | ⚠️ 需新建 | 当前项目无 @Async 基础设施 |
| **速率限制** | ⚠️ 需自建 | 防止单用户过度调用（开源免费项目，无需成本控制但需防滥用） |

### 关键风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| Spring AI 2.x 非GA，API 可能变动 | 🔴 高 | Phase 0 验证兼容性；备选方案：手动 RestClient |
| 模式3 全历史调用耗时长（30-120秒） | 🔴 高 | 必须异步 + 进度轮询，不能同步阻塞 |
| LLM Token 限制导致大历史无法一次性分析 | 🟡 中 | 分块策略 + 预飞行Token估算 |
| 用户情绪数据发送到第三方API的隐私合规 | 🟡 中 | MiniMax 中国托管 + 用户同意流程 |
| LLM 幻觉（捏造数据、不当建议） | 🟡 中 | 系统提示约束 + 免责声明 + 数据交叉验证 |

---

## 2. 当前代码库现状

### 已有基础设施（可直接复用）

| 组件 | 位置 | 复用方式 |
|------|------|----------|
| 用户认证 & 数据隔离 | `JwtAuthenticationFilter` → `request.getAttribute("userId")` | 所有AI端点沿用此模式 |
| 统一响应格式 | `ApiResponse<T>` (code/message/data) | AI响应继承此格式 |
| 异常处理 | `GlobalExceptionHandler` + `BusinessException` 体系 | 新增 AI 异常子类 |
| 缓存层 | Redisson + Spring `@Cacheable`（`::`分隔符） | AI结果缓存（更长TTL） |
| 日志追踪 | MDC `traceId` + `userId` | AI调用日志自动关联 |
| 日程数据 | `Schedule` entity（title, description, feeling, date） | AI分析的数据源 |

### 需要新建的组件

| 组件 | 说明 |
|------|------|
| `ai/` 后端模块 | controller / service / dto / entity / config |
| `AiSession` 实体 | 持久化会话（会话类型、状态、进度、结果JSON） |
| `AiMessage` 实体 | 持久化消息（会话ID、角色、内容、序号） |
| `AiSessionSchedule` 实体 | 关联表：本次会话涉及哪些日程（N:M） |
| 异步执行器 | `@EnableAsync` + `ThreadPoolTaskExecutor` |
| LLM 配置 | `.env` 新增 `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` 等 |
| 前端 AI 页面 | `frontend/src/pages/AI/` — 独立页面，聊天UI + 会话侧边栏 + 模式选择 |

---

## 3. 数据模型设计（持久化）

### 设计原则

1. **会话独立性**: 每次AI分析会话完全独立，不跨会话共享上下文。用户可同时拥有多个会话。
2. **会话内记忆**: 同一会话内，通过**滑动窗口**保留最近 N 轮对话（默认 20 条消息），超出窗口的旧消息自动排除。
3. **日程关联**: 通过 `ai_session_schedules` 关联表记录本次会话涉及哪些日程，支持追溯和复现。
4. **用户隔离**: 所有表通过 `user_id` 关联用户，查询全部带 `user_id` 过滤。

### ER 关系

```
User (1) ──< (N) AiSession (1) ──< (N) AiMessage
                  │
                  │ (N:M)
                  │
          AiSessionSchedule
                  │
                  │ (M:1)
                  │
              Schedule
```

### 3.1 AiSession（分析会话表）

```sql
CREATE TABLE ai_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,              -- 用户隔离
    mode VARCHAR(20) NOT NULL,            -- 'CHAT' | 'PERIOD' | 'FULL_HISTORY'
    status VARCHAR(20) NOT NULL,          -- 'ACTIVE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    title VARCHAR(255),                   -- 自动生成（如"3月情绪分析"）或用户命名
    time_range_start DATE,                -- 模式2/3: 起始日期
    time_range_end DATE,                  -- 模式2/3: 结束日期
    -- 模式3 异步进度
    progress_percent INT DEFAULT 0,       -- 0-100
    progress_detail VARCHAR(500),         -- "正在分析第3个月，共12个月..."
    -- 分析结果
    result_json LONGTEXT,                 -- 最终分析 JSON（结构化摘要 + 洞察 + 建议）
    -- Token 统计（用于用量展示，无需成本计算）
    token_count_input INT DEFAULT 0,
    token_count_output INT DEFAULT 0,
    -- 上下文窗口配置
    memory_window_size INT DEFAULT 20,    -- 会话内保留最近 N 轮消息
    error_message TEXT,                   -- 失败时记录
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    completed_at DATETIME,
    version BIGINT NOT NULL DEFAULT 0,    -- @Version 乐观锁
    INDEX idx_session_user (user_id),
    INDEX idx_session_user_status (user_id, status),
    INDEX idx_session_user_mode (user_id, mode)
);
```

### 3.2 AiMessage（会话消息表）

```sql
CREATE TABLE ai_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,           -- 所属会话
    role VARCHAR(20) NOT NULL,            -- 'SYSTEM' | 'USER' | 'ASSISTANT'
    content TEXT NOT NULL,                -- 消息正文
    token_count INT DEFAULT 0,            -- 本消息 token 数
    sequence_num INT NOT NULL,            -- 消息序号（保证顺序）
    created_at DATETIME NOT NULL,
    INDEX idx_message_session (session_id),
    INDEX idx_message_session_seq (session_id, sequence_num),
    FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE
);
```

> **会话内记忆实现**：查询时 `ORDER BY sequence_num DESC LIMIT {memory_window_size}` 获取最近 N 条消息，再反转顺序后构建上下文窗口。旧消息保留在库中但不出现在上下文窗口。

### 3.3 AiSessionSchedule（会话-日程关联表）

```sql
CREATE TABLE ai_session_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    schedule_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_session_schedule (session_id, schedule_id),  -- 防重复
    INDEX idx_session (session_id),
    INDEX idx_schedule (schedule_id),
    FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);
```

> **设计理由**：不使用 `TEXT` 字段存储 JSON 数组，因为：
> - 关联表支持 JOIN 查询（如"查找所有分析过 3月15日 日程的会话"）
> - 外键约束保证数据完整性（日程删除时可感知）
> - 可扩展（后续可添加 `diary_id` 关联日记）

### 3.4 会话状态流转

```
ACTIVE ──→ PROCESSING ──→ COMPLETED
  │                         │
  │                         └──→ (用户可查看/删除)
  │
  └──→ PROCESSING ──→ FAILED ──→ (用户可重试 → PROCESSING)
```

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| ACTIVE | 会话创建，可通过 `/api/ai/sessions` 列出 |
| PROCESSING | 分析进行中（模式2/3 异步） | 提交分析请求 |
| COMPLETED | 分析完成，`result_json` 非空 | LLM 返回结果 |
| FAILED | 分析失败，`error_message` 记录原因 | 超时/API异常/Token超限 |

---

## 4. 阶段规划

### Phase 0：基础设施与可行性验证 ⏱️ 1-2天

**目标**: 验证技术可行性，不写业务代码

- [ ] 在隔离项目中测试 Spring AI 2.0.0-M6 + MiniMax starter + Spring Boot 4.0.5 兼容性
- [ ] 若不兼容：评估手动 RestClient 方案
- [ ] ~~选型LLM提供商~~ → **已确定：MiniMax-2.7M**
- [ ] 测试基础 Prompt → Response 链路
- [ ] 实测每个日程项的 Token 消耗（title 单独 / title+description）
- [ ] 决策：异步方案（@Async vs 数据库作业队列）
- [ ] 决策：流式方案（SSE vs 轮询）
- [ ] **产出**: 技术决策文档 + Token 用量报告

### Phase 1：模式2 — 时间区间批量分析 ⏱️ 3-5天

**目标**: 最简单模式端到端打通

**后端**:
- `AiAnalysisController` — 新增 `POST /api/ai/analyze`（传入 timeRange）
- `AiAnalysisService` — 查询日程 → 组装 Prompt → 调用 LLM → 解析响应
- `AiSession` / `AiMessage` / `AiSessionSchedule` 实体 + Repository
- AI 配置（`AiConfig.java`，LLM Client Bean）
- 异常处理（LLM超时、API不可用、Token超限）

**前端** (新页面 `frontend/src/pages/AI/`):
- 路由 `/ai`（懒加载，在 `App.tsx` 中注册）
- 模式选择 + 时间范围选择器 + 分析按钮
- 加载状态 + 结果展示（Markdown渲染）
- 隐私同意弹窗（首次使用时）

**验收**: 用户选择日/周/月 → 5-15秒获得中文分析结果 → 结果持久化到数据库

### Phase 2：模式1 — 选择性对话分析 ⏱️ 5-7天

**目标**: 聊天界面 + 流式响应 + 多轮对话

**后端**:
- `POST /api/ai/chat` — 提交消息，返回 `sessionId`
- `GET /api/ai/chat/stream/{sessionId}` — SSE 流式响应
- 多轮对话上下文管理（查询 `ai_messages` 最近 N 条构建滑动窗口，默认20轮）
- 日程选择传入（最多10条作为上下文）

**前端** (独立页面 `frontend/src/pages/AI/`，路由 `/ai` 懒加载):
- 模式选择器（对话 / 时间区间 / 全历史）
- 日程选择器组件（多选 + 情绪徽章 + 最多10条限制）
- 聊天UI（消息气泡 + 打字效果 + 自动滚动）
- 左侧会话列表侧边栏（新建/切换/删除会话）
- `useAIStream` Hook（EventSource 处理 SSE）

**验收**: 选择日程 → 自由对话 → 流式显示 → 会话可恢复

### Phase 3：模式3 — 全历史分块分析 ⏱️ 7-10天

**目标**: 异步管道 + 分块策略 + 进度追踪

**后端**:
- `POST /api/ai/analyze/full` → 返回 `sessionId`，后台异步执行
- `GET /api/ai/analyze/status/{sessionId}` → 轮询进度
- `AiChunkingService` — 分块逻辑（按月分组 → 逐月摘要 → 合并 → 最终分析）
- 两阶段 LLM 管道：
  - 阶段1：每月数据 → LLM 生成结构化 JSON 摘要
  - 阶段2：合并所有摘要 → LLM 生成最终分析报告
- `@Async` 异步执行 + 进度实时更新到 Session 表
- Token 预估算 + 超限拒绝
- 单分块失败重试3次，可跳过继续
- 中间结果缓存 Redis（TTL 10分钟）

**前端**:
- "全历史分析"按钮 + 确认弹窗（提示耗时）
- 进度条组件（"正在分析第3个月，共12个月..."）
- 取消分析功能
- 完成后自动跳转到结果页

**验收**: 2年历史数据 → 30-120秒 → 跨月趋势洞察 + 完整报告

### Phase 4：打磨与上线 ⏱️ 3-5天

- [ ] 用户速率限制（每天最多 N 次 LLM 调用）
- [ ] Token 用量统计 & 展示
- [ ] 隐私同意弹窗（数据会发送到 AI 服务）
- [ ] 移动端适配
- [ ] 暗色模式支持
- [ ] 免责声明："AI分析仅供参考，非心理医疗建议"
- [ ] 历史会话管理（查看、删除、重命名）

---

## 5. 关键技术决策（已确认）

| # | 决策点 | 确认结果 |
|---|--------|----------|
| 1 | **LLM 提供商** | **MiniMax-2.7M** — `spring-ai-starter-model-minimax`，支持流式、函数调用、中文优化 |
| 2 | **API Key 管理** | 代码中使用占位符 `${MINIMAX_API_KEY}`，上线前用户自行配置 `.env` |
| 3 | **异步方案** | @Async 先上（Phase 1），Phase 3 迁移到数据库作业队列 |
| 4 | **流式方案** | SSE（聊天流式输出）+ 轮询（模式3进度查询） |
| 5 | **缓存策略** | 最终结果用 Spring `@Cacheable`，管道中间结果 Redis 直存 |
| 6 | **分块策略** | 混合：<500条直接传，≥500条按月分块（每块 ≤200条） |
| 7 | **商业模式** | 完全开源免费，无需成本追踪，仅需速率限制防滥用 |
| 8 | **数据隔离** | 沿用现有 JWT → `userId` → 全链路过滤模式 |

### MiniMax 配置示例

```properties
# application.properties
spring.ai.minimax.api-key=${MINIMAX_API_KEY:placeholder}
spring.ai.minimax.chat.options.model=minimax-2.7m
spring.ai.minimax.chat.options.temperature=0.7
spring.ai.minimax.chat.options.max-tokens=4096

# 自定义
diary.ai.max-schedules-per-chat=10        # 模式1: 最多选择10条日程
diary.ai.max-daily-requests=50            # 每用户每天最多50次调用
diary.ai.max-history-months=24            # 模式3: 最多分析24个月
diary.ai.async-timeout-seconds=300        # 模式3: 总超时5分钟
diary.ai.memory-window-size=20            # 会话内保留最近20轮对话
```

```bash
# .env
MINIMAX_API_KEY=your_api_key_here
```

---

## 6. 已全部确认 ✅

| # | 问题 | 确认结果 |
|---|------|----------|
| 5 | 日记文本是否纳入分析 | ✅ 纳入 — 模式2/3 会将日程 + 日记一并传入 LLM |
| 6 | 隐私同意弹窗 | ✅ 需要 — 首次使用弹窗告知数据发送至 MiniMax |
| 7 | AI 角色定位 | ✅ **情绪平衡助手**：善于理解情绪波动，给出分析、建议和安慰 |
| 8 | 页面位置 | ✅ **独立页面** `/ai` — 自由UI布局 + 会话切换侧边栏 |

### 日记纳入对架构的影响

- **数据源扩展**：分析查询需同时涉及 `ScheduleRepository` + `DiaryRepository`
- **Token 消耗增加**：日记 `content` 最大 5000 字，约为 1500-2500 tokens/篇
- **Prompt 结构调整**：需将日记文本与日程情绪值共同传入，让 AI 理解"做了什么 + 感受如何 + 写了什么"
- **关联表预留**：`ai_session_schedules` 表预留 `diary_id` 扩展字段，后续可追溯会话涉及哪些日记

> **所有决策已确认。进入 Phase 0 实施。**

---

## 7. AI 角色 & 系统提示设计

### 角色定位

**情绪平衡助手（"小七"）** — 兼具数据分析洞察和情感陪伴能力，基于用户的日程记录和日记文本：
- 识别情绪波动模式（日/周/月趋势）
- 提供心理学视角的分析（参考峰终定律、ABC理论、表达性书写）
- 给出温和、可操作的建议
- 在情绪低落时给予安慰和鼓励

### 系统提示（草案）

```
你是一个温暖而专业的情绪平衡助手，名字叫"小七"。
你会收到用户的日程记录（包含情绪值 -3 到 +3）和日记文本。
你的职责是：

1. **情绪分析** — 识别情绪波动模式，但不要像机器报数据，而是像朋友一样娓娓道来
2. **洞察建议** — 结合日程内容给出温和的建议，不强制、不说教
3. **情感支持** — 当用户情绪低落时，先共情再分析，用温暖的语言给予力量

核心原则：
- 只基于提供的数据说话，绝不捏造信息
- 数据中的情绪值是 -3（极差）到 +3（极好），0 代表中性
- 语气温和、亲切，像一个善解人意的朋友
- 永远不要给出医疗建议或诊断
- 结尾加上："以上分析由AI生成，仅供参考 ❤️"
```

### 不同模式的 Prompt 变体

| 模式 | 系统提示侧重 | 输入数据 |
|------|-------------|----------|
| 模式1 对话 | 自由聊天 + 日程上下文，用户引导话题 | 选定日程 title/description/feeling |
| 模式2 时间区间 | 时间段总结分析 + 趋势 + 建议 | 该时间段日程 + 日记全文 |
| 模式3 全历史 | 跨月趋势洞察 + 长期变化 + 深度反思引导 | 分段摘要 → 合并 → 综合分析 |

---

## 8. Phase 0 技术验证报告 ✅ 已完成

> **验证日期**: 2026-05-11 | **验证人**: Sisyphus | **状态**: 全部通过

### 8.1 依赖兼容性 ✅

| 检查项 | 结果 |
|--------|------|
| Spring AI BOM 2.0.0-M6 | ✅ `org.springframework.ai:spring-ai-bom:2.0.0-M6` Maven Central 可用 |
| MiniMax Starter | ✅ `spring-ai-starter-model-minimax:2.0.0-M6` 依赖树完整 |
| Spring Boot 4.0.5 兼容 | ✅ `mvn compile` BUILD SUCCESS，零冲突 |
| 仓库需求 | ✅ Maven Central 即可，无需 milestone/snapshot 仓库 |
| 121 项现有测试 | ✅ 全部通过，零回归 |

### 8.2 自动配置验证 ✅

| 检查项 | 结果 |
|--------|------|
| `MiniMaxChatModel` Bean | ✅ 自动注入成功 |
| `ChatClient.Builder` | ✅ 可用 |
| Health 端点 | ✅ `/api/ai/health` 返回 `chatModelReady: true` |

### 8.3 中文 Prompt → Response 链路 ✅

```
→ Prompt: "用中文简单介绍自己，20字以内"
← Response: "我是你的情绪平衡助手，陪你一起找回内心的平静。"
```

- **模型**: MiniMax-M2.7（**注意**: 非 MiniMax-2.7M，API model ID 为 `MiniMax-M2.7`）
- **响应质量**: 中文流畅自然，完全可用
- **响应时间**: < 3s（本地网络）

### 8.4 Token 消耗实测

**测试数据**: 系统提示 + 5条日程（含标题/情绪/描述） + 1篇日记（150字）

| 指标 | 数值 |
|------|------|
| Prompt Tokens | 239 |
| Completion Tokens | 189 |
| Total Tokens | **428** |
| 每条日程约 | ~30 tokens |
| 每篇日记（150字）约 | ~100 tokens |
| 系统开销 | ~38 tokens |

**外推估算**:

| 场景 | 预估 Tokens | 是否超出 4096 限制？ |
|------|------------|---------------------|
| Mode 1: 10条日程 | ~400 | ✅ 安全 |
| Mode 1: 10条日程 + 20轮历史 | ~2400 | ✅ 安全 |
| Mode 2: 30天×3条/天 + 10篇日记 | ~3900 | ⚠️ 接近上限 |
| Mode 2: 30天×3条/天 + 30篇日记 | ~5900 | ❌ 超出，需分块 |
| Mode 3: 全历史 | >10000 | ❌ 必须用分段摘要策略 |

### 8.5 关键发现与决策

| # | 发现 | 决策 |
|---|------|------|
| 1 | Model ID 为 `MiniMax-M2.7`（非 MiniMax-2.7M） | 已修正配置 |
| 2 | 4096 max-tokens 对 Mode 2（含日记）可能不够 | Phase 1 先限制日记输入字数或分块 |
| 3 | Spring AI 自动配置完全可用，无需手动 Bean | 直接使用 `ChatClient.Builder` |
| 4 | `@Async` 尚未配置，Mode 3 需异步 | Phase 1 创建 `@EnableAsync` 配置 |
| 5 | miniMax API 返回完整 usage metadata | 可用于成本跟踪 |

### 8.6 已创建文件

```
backend/src/main/java/com/diaryproject/backend/ai/
├── controller/AiController.java    # /api/ai/health, /api/ai/test-prompt, /api/ai/estimate-tokens
├── service/AiService.java          # MiniMaxChatModel 封装
└── dto/AiDTO.java                  # 请求/响应 DTO

backend/src/main/resources/application.properties  # 新增 MiniMax 配置
backend/pom.xml                                    # 新增 Spring AI BOM + MiniMax starter
.env                                               # 新增 MINIMAX_API_KEY
```

> **Phase 0 通过。所有技术前提已验证，可进入 Phase 1 实施。**
