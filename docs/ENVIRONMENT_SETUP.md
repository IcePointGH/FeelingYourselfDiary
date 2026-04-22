# 环境变量配置指南

本项目敏感配置（数据库密码、JWT 密钥、MinIO 凭据等）通过环境变量管理，**不在代码中明文存储**。

## 配置文件位置

```
FeelingYourselfDiary/
├── .env                     # 项目根目录，仅供 docker-compose 读取
├── .env.example             # 环境变量模板（可安全提交到 Git）
├── docker-compose.yml        # 读取 .env 中的变量
└── backend/
    ├── .gitignore            # 忽略 ../.env，即项目根目录的 .env
    └── src/main/resources/
        └── application-local.properties.example
```

> `.env` 位于项目根目录，docker-compose 会自动读取它，同时被 `backend/.gitignore` 忽略，不会被提交到 Git。
>
> **注意**：Spring Boot 不会自动读取 `.env` 文件，`.env` 仅供 docker-compose 使用。后端环境变量需要通过 IDE 配置（方式二）或 `application-local.properties`（方式三）注入。

## 方式一：.env 文件（仅用于 docker-compose）

### 1. 创建 .env 文件

```bash
cp .env.example .env
```

### 2. 填写实际值

`.env.example` 包含所有必需变量，复制后替换为实际值。

### 3. 启动基础设施服务

```bash
docker-compose up -d        # docker-compose 自动读取 .env
```

> `.env` 文件仅供 docker-compose 读取。启动后端服务时，需要通过方式二或方式三配置环境变量。

## 方式二：IDE 环境变量配置

### IntelliJ IDEA

1. 打开 **Run > Edit Configurations**
2. 选择 Spring Boot 启动配置
3. 在 **Environment variables** 中选择根目录下的 `.env` 文件作为环境变量来源，或手动添加变量
4. 保存后启动应用

### VS Code

在 `.vscode/launch.json` 中添加 `env` 字段：

```json
{
  "configurations": [
    {
      "name": "Spring Boot",
      "type": "java",
      "env": {
        "DB_URL": "jdbc:mysql://localhost:3306/emotion_diary?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai",
        "DB_USERNAME": "root",
        "DB_PASSWORD": "your_password",
        "JWT_SECRET": "your_secret_key_at_least_32_chars",
        "JWT_EXPIRATION": "86400000",
        "CORS_ORIGINS": "http://localhost:3000",
        "MINIO_ENDPOINT": "http://localhost:9000",
        "MINIO_ROOT_USERNAME": "minioadmin",
        "MINIO_ROOT_PASSWORD": "your_minio_password",
        "MINIO_ACCESS_KEY": "your_access_key",
        "MINIO_SECRET_KEY": "your_secret_key"
      }
    }
  ]
}
```

## 方式三：application-local.properties（可选，本地开发备用）

1. 复制 `backend/src/main/resources/application-local.properties.example` 为 `application-local.properties`
2. 填入实际值
3. 在 IDE 中激活 `local` profile 或添加启动参数 `--spring.profiles.active=local`

> `application-local.properties` 已加入 `.gitignore`，不会被提交。

## 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DB_URL` | 数据库连接 URL | `jdbc:mysql://localhost:3306/emotion_diary?...` |
| `DB_USERNAME` | 数据库用户名 | `root` |
| `DB_PASSWORD` | 数据库密码 | （自定义） |
| `JWT_SECRET` | JWT 签名密钥（至少 32 字符） | （自定义，至少 32 字符） |
| `JWT_EXPIRATION` | JWT 过期时间（毫秒） | `86400000`（24 小时） |
| `CORS_ORIGINS` | 允许的跨域源 | `http://localhost:3000` |
| `MINIO_ENDPOINT` | MinIO 服务地址 | `http://localhost:9000` |
| `MINIO_ROOT_USERNAME` | MinIO Root 用户名 | `minioadmin` |
| `MINIO_ROOT_PASSWORD` | MinIO Root 密码 | （自定义） |
| `MINIO_ACCESS_KEY` | MinIO Access Key | （自定义） |
| `MINIO_SECRET_KEY` | MinIO Secret Key | （自定义） |
