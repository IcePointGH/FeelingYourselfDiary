# Feeling Yourself Diary

一个简洁优雅的全栈情绪日记 Web 应用，帮助用户记录每日日程、书写心情日记，并通过数据可视化了解自己的情绪变化趋势。

## 功能特性

- **日程与情绪记录** — 按日期记录每日事项，并为每条事项标注情绪值（-3 极差 ~ +3 极好）
- **心情日记** — 随时随地书写日记，按日期回顾过往思绪
- **历史查看** — 浏览所有日程与日记记录
- **情绪分析** — 按日、周、月维度统计情绪走势，生成可视化分析报告
- **个性化设置** — 支持主题切换（莫兰迪 / 极简）、自定义情绪标签等
- **用户认证** — JWT 无状态认证，数据严格按用户隔离，保障隐私安全

## 技术栈

### 前端
- React 19 + TypeScript
- React Router DOM 7（含路由懒加载与代码分割）
- Vite 8
- CSS3（CSS Modules + 全局共享样式）

### 后端
- Spring Boot 4.0.5
- Java 21
- Spring Data JPA（含 @Transactional / @Version 乐观锁）
- Spring Security + JWT (jjwt)
- Bean Validation
- SLF4J + Logback（JSON 日志滚动归档 + MDC 请求追踪）
- Lombok
- Maven

### 数据库与基础设施
- MySQL 8.0
- MinIO (对象存储)
- Docker & Docker Compose

## 项目结构

```
FeelingYourselfDiary/
├── .env                     # 环境变量配置（敏感信息，git 忽略）
├── docker-compose.yml        # MySQL + MinIO 容器配置
├── init.sql                 # 数据库初始化脚本
├── docs/
│   ├── ENVIRONMENT_SETUP.md # 环境变量配置指南
│   ├── code-review-fix-plan.md  # 审计与修复计划
│   └── fix-checklist.md     # 修复状态清单
├── frontend/                # React 前端
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   │   ├── Layout/       # 页面布局（含 Sidebar）
│   │   │   ├── DateInput/    # 日期选择器
│   │   │   ├── FeelingSelector/ # 情绪值选择器
│   │   │   ├── ScheduleItemCard/ # 日程卡片
│   │   │   ├── CollapsiblePanel/ # 可折叠面板
│   │   │   ├── StatCard/     # 统计数据卡片
│   │   │   ├── Toast/        # 消息提示
│   │   │   ├── ErrorBoundary # 渲染错误兜底
│   │   │   └── PageSkeleton  # 路由懒加载占位
│   │   ├── contexts/         # React Context
│   │   │   ├── AuthContext   # 认证状态
│   │   │   ├── ThemeContext  # 主题切换
│   │   │   ├── ToastContext  # 全局消息提示
│   │   │   └── EmotionLabelsContext # 情绪标签文本
│   │   ├── hooks/           # 自定义 Hooks
│   │   │   ├── useApi.ts    # 认证 API 请求封装
│   │   │   └── useFetch.ts  # 通用数据加载（三态管理）
│   │   ├── pages/           # 页面组件
│   │   │   ├── Login/       # 登录
│   │   │   ├── Register/    # 注册
│   │   │   ├── Schedule/    # 日程与情绪记录
│   │   │   ├── Thoughts/    # 心情日记
│   │   │   ├── History/     # 历史记录（日历 + 分页列表）
│   │   │   ├── Analysis/    # 情绪分析（含子组件 MoodTrendChart / MoodSummary）
│   │   │   └── Settings/    # 个人设置（含子组件 ThemeSettings / DataManagement）
│   │   ├── services/        # API 接口定义
│   │   ├── styles/          # 全局共享样式（卡片、表单、按钮等）
│   │   ├── types/           # TypeScript 类型定义
│   │   └── utils/           # 工具函数（情绪值格式化、日历生成）
│   ├── public/
│   └── package.json
└── backend/                 # Spring Boot 后端
    ├── src/main/java/com/diaryproject/backend/
    │   ├── auth/            # 认证模块（User、登录注册、JWT）
    │   ├── schedule/        # 日程模块
    │   ├── diary/           # 日记模块
    │   ├── analysis/        # 分析统计模块（含 JPQL 聚合投影）
    │   ├── settings/        # 用户设置模块
    │   └── common/          # 公共组件
    │       ├── config/      # Spring Security 配置
    │       ├── dto/         # 统一响应 ApiResponse<T>
    │       ├── exception/   # 自定义异常层次 + 全局处理器
    │       ├── filter/      # JWT 认证过滤器 + MDC 追踪过滤器
    │       └── security/    # JWT 工具类
    ├── src/main/resources/
    │   ├── application.properties
    │   └── logback-spring.xml  # 结构化日志配置（控制台 + JSON 滚动文件）
    ├── src/test/             # 单元测试（70 项）
    └── pom.xml
```

## 快速开始

### 环境要求
- Node.js >= 20
- Java 21
- Maven 3.9+
- Docker & Docker Compose

### 1. 配置环境变量

在项目根目录创建 `.env` 文件（从 `.env.example` 复制并修改）：

```bash
# 数据库
DB_URL=jdbc:mysql://localhost:3306/emotion_diary?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
DB_USERNAME=root
DB_PASSWORD=your_password_here

# MinIO 对象存储
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USERNAME=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password_here
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

# JWT
JWT_SECRET=your_secret_key_at_least_32_chars
JWT_EXPIRATION=86400000

# CORS
CORS_ORIGINS=http://localhost:3000
```

> `.env` 文件位于项目根目录，docker-compose 会自动读取，同时被 `backend/.gitignore` 忽略，不会被提交到 Git。

### 2. 启动数据库和存储服务

```bash
docker-compose up -d
```

启动后包含：
- **MySQL** `localhost:3306` — 数据库 `emotion_diary`
- **MinIO Console** `localhost:9001` — 对象存储管理界面（登录凭据为 `MINIO_ROOT_USERNAME` / `MINIO_ROOT_PASSWORD`）

### 3. 启动后端服务

```bash
cd backend
./mvnw spring-boot:run
```

后端服务将运行在 `http://localhost:8080`。

### 4. 启动前端开发服务器

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器将运行在 `http://localhost:3000`，并通过 Vite 代理将 `/api` 请求转发至后端。

## 开发命令

### 前端
```bash
cd frontend
npm run dev      # 启动开发服务器（端口 3000）
npm run build    # 生产构建
npm run lint     # 运行 ESLint
npm run preview  # 预览生产构建
```

### 后端
```bash
cd backend
./mvnw spring-boot:run   # 启动 Spring Boot（端口 8080）
./mvnw test              # 运行单元测试
./mvnw package           # 打包为可执行 JAR
```

### 数据库与服务
```bash
docker-compose up -d       # 启动 MySQL + MinIO
docker-compose down         # 停止服务
docker-compose down -v      # 停止并删除数据卷（重置数据库）
```

## API 概览

所有 API 均以 `/api` 为前缀，前端通过 Vite 代理自动转发。

| 端点 | 方法 | 说明 | 认证 |
|---|---|---|---|
| `/api/auth/register` | POST | 用户注册 | 否 |
| `/api/auth/login` | POST | 用户登录 | 否 |
| `/api/auth/me` | GET | 获取当前用户信息 | 是 |
| `/api/schedules` | GET | 日程分页列表（`?page=0&size=20`） | 是 |
| `/api/schedules` | POST | 创建日程 | 是 |
| `/api/schedules/date/{date}` | GET | 按日期获取日程 | 是 |
| `/api/diaries` | GET | 日记分页列表（`?page=0&size=20`） | 是 |
| `/api/diaries` | POST | 创建日记 | 是 |
| `/api/diaries/date/{date}` | GET | 按日期获取日记 | 是 |
| `/api/analysis/daily` | GET | 日情绪分析（聚合查询） | 是 |
| `/api/analysis/weekly` | GET | 周情绪分析（聚合查询） | 是 |
| `/api/analysis/monthly` | GET | 月情绪分析（聚合查询） | 是 |
| `/api/settings` | GET/PUT | 获取 / 更新用户设置 | 是 |

## 关键设计

- **用户数据隔离**：所有数据查询均通过 JWT 中的用户 ID 过滤，确保多租户安全
- **乐观锁并发控制**：核心实体使用 `@Version` 字段，防止并发覆盖更新
- **事务管理**：写操作统一标注 `@Transactional`，保证多表操作原子性
- **参数校验**：DTO 层 Bean Validation 注解，非法输入在 Controller 层即被拦截
- **自定义异常层次**：`BusinessException` 体系按语义映射 HTTP 状态码（404 / 400 / 401 / 409），前端精准响应
- **RESTful API**：统一的资源导向 URL 设计，使用标准 HTTP 方法，列表接口支持分页
- **统一响应格式**：后端返回 `ApiResponse<T>` 标准结构（code / message / data）
- **密码安全**：BCrypt 强哈希存储密码；登录/注册错误消息模糊化，防用户名枚举
- **JWT 安全**：启动时校验密钥最小长度（≥32 字符）；无效 Token 记录审计日志并返回 401
- **请求追踪**：MDC 过滤器为每个请求注入 `traceId` 和 `userId`，日志全链路可追溯
- **结构化日志**：Logback 双通道输出（控制台可读格式 + JSON 文件滚动归档）
- **前端容错**：Error Boundary 兜底渲染异常；Toast 统一用户提示，替代浏览器 alert
- **代码分割**：非首屏路由（Analysis / History / Settings）懒加载，减少初始包体积
- **数据库自动初始化**：表结构由 Spring Data JPA 自动创建（`ddl-auto=update`），`init.sql` 用于后续数据迁移或种子数据

## 截图

> 待补充应用界面截图

## 许可证

MIT License
