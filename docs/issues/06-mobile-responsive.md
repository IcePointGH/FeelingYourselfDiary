# 06 - AI 页面移动端适配

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

AI 页面（`/ai`）移动端响应式布局优化。

**断点：768px（与项目已有 Sidebar 折叠逻辑一致）**

**AI.module.css 媒体查询改造：**

1. **SessionSidebar 折叠**（< 768px）：
   - 默认隐藏（`display: none`），通过汉堡菜单按钮 toggle
   - 展开为全屏浮层（`position: fixed`，`z-index: 100`，宽度 100vw）
   - 选中会话后自动关闭浮层
   - 汉堡菜单图标：`fa-bars`（Font Awesome，项目已用）

2. **聊天区域全宽**（< 768px）：
   - 消息气泡 `max-width: 100%`（桌面端为 `70%`）
   - 输入框 sticky 底部，padding 适配安全区
   - 按钮最小触控区域 ≥ 44×44px

3. **Mode 2 分析 Tab**（< 768px）：
   - 日期选择器垂直堆叠（flex-direction: column）
   - "开始分析"按钮 full-width

4. **Mode 3 全历史 Tab**（< 768px）：
   - 进度条 + 按钮全宽

**不使用 Tailwind** — CSS Modules 原生媒体查询（项目约定）。

## Acceptance criteria

- [ ] 视口 < 768px：侧边栏隐藏，显示汉堡菜单按钮
- [ ] 点击汉堡菜单 → 侧边栏全屏浮层展开，带半透明遮罩
- [ ] 选择会话或点击遮罩 → 侧边栏关闭
- [ ] 聊天消息气泡全宽显示，无横向挤压
- [ ] 所有交互元素触控区域 ≥ 44×44px（无 iOS 缩放触发）
- [ ] 输入框在键盘弹出时可见（不被遮挡）
- [ ] 日期选择器在窄屏下垂直排列
- [ ] 暗色模式下遮罩/浮层颜色适配（`[data-theme='dark']`）

## Blocked by

None - can start immediately
