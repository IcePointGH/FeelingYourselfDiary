# 01 - 生产配置加固

**Status:** ready-for-agent  
**Type:** AFK  
**Blocked by:** None

---

## What to build

收紧 AI 模块的生产安全配置，使系统达到准生产级：

1. **CORS 白名单**：将 `SecurityConfig` 中 `allowedOriginPatterns("*")` 改为读取 `CORS_ORIGINS` 环境变量（逗号分隔），默认值 `http://localhost:3000,https://sevensense.art`
2. **数据库模式管理**：`spring.jpa.hibernate.ddl-auto` 从 `update` 改为 `validate`，确保 JPA 实体与数据库表结构精确匹配

纯后端变更，无前端改动。

## Acceptance criteria

- [ ] `CORS_ORIGINS` 环境变量配置后，仅允许指定域名的跨域请求
- [ ] 未在白名单中的域名发起 API 请求被浏览器 CORS 策略拦截
- [ ] `ddl-auto=validate` 后应用启动成功，数据库表结构无差异报错
- [ ] 单元测试 121 项全部通过（无回归）

## Blocked by

None - can start immediately
