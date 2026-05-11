# AI 情绪分析 — 可行性分析 & 阶段规划

**创建时间:** 2026-05-11
**状态:** Phase 0 — 可行性验证
**关联需求:** 三种AI分析模式（自由对话 / 时间区间 / 全历史分块）

---

## 1. 可行性评估

### 总体结论：✅ 可行，但需分阶段实施

| 维度 | 评估 | 说明 |
|------|------|------|
| **后端框架兼容性** | ⚠️ 需验证 | Spring AI 2.0.0-M6 支持 Spring Boot 4.x，但仍是里程碑版本（非GA） |
| **LLM中文支持** | ✅ 优秀 | DeepSeek 一等公民支持、MiniMax、任意 OpenAI 兼容端点 |
| **流式响应(SSE)** | ✅ 就绪 | Spring AI `Flux<String>` + Spring WebFlux SSE |
| **会话持久化** | ✅ 就绪 | JDBC ChatMemory 直接存 MySQL，或自建实体表 |
| **分块分析（模式3）** | ⚠️ 需自建 | Spring AI 无内置分块管道，需自定义 Advisor + Async |
| **异步处理** | ⚠️ 需新建 | 当前项目无 @Async 基础设施 |
| **成本控制** | ⚠️ 需自建 | Spring AI 有 FinOps 模块（PR中），需手动集成 |

### 关键风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| Spring AI 2.x 非GA，API 可能变动 | 🔴 高 | Phase 0 验证兼容性；备选方案：手动 RestClient |
| 模式3 全历史调用耗时长（30-120秒） | 🔴 高 | 必须异步 + 进度轮询，不能同步阻塞 |
| LLM Token 限制导致大历史无法一次性分析 | 🟡 中 | 分块策略 + 预飞行Token估算 |
| 用户情绪数据发送到第三方API的隐私合规 | 🟡 中 | 使用中国托管LLM（DeepSeek）+ 用户同意流程 |
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
| `AiAnalysisSession` 实体 | 持久化会话（会话类型、状态、进度、结果JSON） |
| `AiAnalysisMessage` 实体 | 持久化消息（会话ID、角色、内容、时间戳） |
| 异步执行器 | `@EnableAsync` + `ThreadPoolTaskExecutor` |
| LLM 配置 | `.env` 新增 `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` 等 |
| 前端 AI 页面 | `frontend/src/pages/AI/` — 聊天UI + 选择器 + 进度条 |

---

## 3. 数据模型设计（持久化）

### 3.1 AiAnalysisSession（分析会话表）

```sql
CREATE TABLE ai_analysis_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    mode VARCHAR(20) NOT NULL,           -- 'CHAT' | 'PERIOD' | 'FULL_HISTORY'
    status VARCHAR(20) NOT NULL,          -- 'ACTIVE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    title VARCHAR(255),                   -- 会话标题（自动生成或用户命名）
    time_range_start DATE,                -- 模式2/3: 分析起始日期
    time_range_end DATE,                  -- 模式2/3: 分析结束日期
    selected_schedule_ids TEXT,           -- 模式1: JSON数组 [1,2,3,...]
    progress_percent INT DEFAULT 0,       -- 模式3: 进度 0-100
    progress_detail VARCHAR(500),         -- 模式3: "正在分析第3个月，共12个月..."
    result_json LONGTEXT,                 -- 最终分析结果 JSON（结构化）
    token_count_input INT DEFAULT 0,      -- 总输入token数
    token_count_output INT DEFAULT 0,     -- 总输出token数
    error_message TEXT,                   -- 失败时的错误详情
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    completed_at DATETIME,
    version BIGINT NOT NULL DEFAULT 0,    -- 乐观锁
    INDEX idx_session_user (user_id),
    INDEX idx_session_user_status (user_id, status)
);
```

### 3.2 AiAnalysisMessage（会话消息表）

```sql
CREATE TABLE ai_analysis_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,            -- 'USER' | 'ASSISTANT' | 'SYSTEM'
    content TEXT NOT NULL,
    token_count INT DEFAULT 0,
    created_at DATETIME NOT NULL,
    INDEX idx_message_session (session_id),
    FOREIGN KEY (session_id) REFERENCES ai_analysis_sessions(id)
);
```

### 3.3 会话状态流转

```
ACTIVE → PROCESSING → COMPLETED
                  ↘ FAILED → (可重试 → PROCESSING)
```

- Mode 1 (CHAT): ACTIVE 持续直到用户主动结束
- Mode 2 (PERIOD): ACTIVE → PROCESSING → COMPLETED
- Mode 3 (FULL_HISTORY): ACTIVE → PROCESSING（带进度更新）→ COMPLETED

---

## 4. 阶段规划

### Phase 0：基础设施与可行性验证 ⏱️ 1-2天

**目标**: 验证技术可行性，不写业务代码

- [ ] 在隔离项目中测试 Spring AI 2.0.0-M6 + Spring Boot 4.0.5 兼容性
- [ ] 若不兼容：评估手动 RestClient 方案
- [ ] 选型LLM提供商（DeepSeek / OpenAI / 其他）
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
- `AiAnalysisSession` / `AiAnalysisMessage` 实体 + Repository
- AI 配置（`AiConfig.java`，LLM Client Bean）
- 异常处理（LLM超时、API不可用、Token超限）

**前端**:
- 在现有 Analysis 页面新增 "AI分析" Tab
- 时间范围选择器 + 分析按钮
- 加载状态 + 结果展示（Markdown渲染）
- 结果自动保存为会话记录

**验收**: 用户选择日/周/月 → 5-15秒获得中文分析结果 → 结果持久化到数据库

### Phase 2：模式1 — 选择性对话分析 ⏱️ 5-7天

**目标**: 聊天界面 + 流式响应 + 多轮对话

**后端**:
- `POST /api/ai/chat` — 提交消息，返回 `sessionId`
- `GET /api/ai/chat/stream/{sessionId}` — SSE 流式响应
- 多轮对话上下文管理（MessageWindowChatMemory）
- 日程选择传入（最多10条作为上下文）

**前端** (新页面 `frontend/src/pages/AI/`):
- 日程选择器组件（多选 + 情绪徽章 + 最多10条限制）
- 聊天UI（消息气泡 + 打字效果 + 自动滚动）
- `useAIStream` Hook（EventSource 处理 SSE）
- 历史会话列表（从数据库加载）
- 路由: `/ai`（懒加载）

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

## 5. 关键技术决策（待确认）

| # | 决策点 | 选项 | 推荐 |
|---|--------|------|------|
| 1 | **LLM 提供商** | DeepSeek（便宜、中文好）vs OpenAI（贵、质量高）vs Ollama（本地、免费） | DeepSeek（中文优、成本低、合规） |
| 2 | **API Key 管理** | 系统全局Key vs 用户自带Key | 系统全局（Phase 1-3），后期可选用户自带 |
| 3 | **异步方案** | @Async + 内存 vs 数据库作业队列 | @Async 先上，Phase 3 迁移 DB 队列 |
| 4 | **流式方案** | SSE vs WebSocket vs 轮询 | SSE（聊天）+ 轮询（模式3进度） |
| 5 | **缓存策略** | Spring @Cacheable vs Redis 直存 | 最终结果用 @Cacheable，管道中间结果 Redis 直存 |
| 6 | **分块策略** | 按月分块 vs 按Token数分块 vs 混合 | 混合：<500条直接传，>500条按月分块 |

---

## 6. 需要用户澄清的问题

### 🔴 阻塞项（必须回答才能进入 Phase 1）

1. **LLM 提供商选择**:DeepSeek（推荐：中文好、成本低）、OpenAI（贵但质量高）、还是其他？（Ollama本地部署？）
2. **API Key 来源**: 谁来提供 API Key？系统统一配置还是用户可以自带？
3. **成本预算**: 可接受的每次分析成本上限？每用户每月调用次数上限？这是免费功能还是付费功能？
4. **持久化确认**: 已明确需要持久化到 MySQL。session + message 两张表的设计是否满足需求？

### 🟡 重要项（建议在 Phase 1 前回答）

5. **日记文本是否纳入分析**: 当前的 Schedule 数据只有 title + feeling。日记的 `content`（5000字自由文本）是否也要送给AI分析？这将显著影响 Token 消耗。
6. **隐私同意**: 用户是否需要看到"您的数据将被发送到 [提供商] 进行分析"的同意弹窗？
7. **AI 角色定位**: AI 应扮演什么角色？数据分析师？情绪教练？知心朋友？这决定系统提示的设计方向。
8. **需要不要新增页面**: AI分析是放在现有 Analysis 页面（新增Tab），还是完全独立的页面路由 `/ai`？

> **请逐一确认以上问题，确认后我将立即进入 Phase 0 实施。**
