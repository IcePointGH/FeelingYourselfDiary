# 07 - AI 页面空状态 & 骨架屏

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

AI 页面缺少的加载态和空态视觉反馈。

**可复用组件（`frontend/src/components/`）：**

1. **`EmptyState`** — 空状态占位组件
   - Props：`icon`（FontAwesome class）、`title`、`description`、`action?`（{ label, onClick }）
   - 布局：纵向居中，图标 + 标题 + 描述 + 可选按钮
   - 支持 dark mode（`data-theme='dark'`）

2. **`Skeleton`** — 骨架屏组件
   - Props：`width`、`height`、`variant`（'text' | 'circle' | 'rect'）、`count?`（多行）
   - 动画：CSS pulse 渐变
   - 支持 dark mode

**AI 页面应用场景：**

- **会话列表为空**（sessionList.length === 0 且非加载中）：
  - EmptyState：`fa-robot` + "开始你的第一次AI对话" + "进入'对话分析'tab发送消息即可自动创建会话"

- **会话列表加载中**（loading === true）：
  - 3 个 Skeleton 卡片（模拟侧边栏会话项外观）

- **分析结果为空**（Mode 2 / Mode 3 未触发分析）：
  - EmptyState：`fa-chart-line` + "选择日期范围，开始情绪分析" + "AI 将根据你的日程和日记数据，分析情绪波动规律"

- **聊天区首次对话**（有 session 但无消息）：
  - EmptyState：`fa-comments` + "发送第一条消息，开始与小七对话"

## Acceptance criteria

- [ ] `EmptyState` 组件：图标 + 标题 + 描述正常渲染，可选按钮可点击
- [ ] `Skeleton` 组件：pulse 动画流畅，支持 text / circle / rect 三种变体
- [ ] 会话列表为空 → 显示 EmptyState 引导（非闪烁空白页）
- [ ] 会话列表加载中 → 3 个 Skeleton 卡片占位
- [ ] 分析区未触发 → 显示 EmptyState 引导
- [ ] 已有会话切到无消息 session → 显示聊天引导
- [ ] 所有 EmptyState / Skeleton 在暗色模式下颜色正确
- [ ] 组件为通用可复用设计（非 AI 页面耦合）

## Blocked by

None - can start immediately
