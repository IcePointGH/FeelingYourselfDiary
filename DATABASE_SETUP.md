# 数据库部署说明

本项目使用 Docker Compose 启动 MySQL 和 MinIO，无需手动安装数据库。

## 启动服务

```bash
docker-compose up -d
```

启动后将包含以下服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| MySQL | `localhost:3306` | 数据库 `emotion_diary` |
| MinIO Console | `localhost:9001` | 对象存储管理界面 |

## 连接信息

连接信息通过 `.env` 环境变量注入，**不要在代码中硬编码密码**。

```bash
# 从 .env 读取以下变量
DB_URL=jdbc:mysql://localhost:3306/emotion_diary?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
DB_USERNAME=root
DB_PASSWORD=<从 .env 读取>
```

### Spring Boot 连接配置

启动后端时，确保环境变量已正确加载。Spring Boot 会通过 `${DB_PASSWORD}` 占位符从环境变量读取密码。

### MinIO 连接配置

```bash
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USERNAME=<从 .env 读取>
MINIO_ROOT_PASSWORD=<从 .env 读取>
MINIO_ACCESS_KEY=<从 .env 读取>
MINIO_SECRET_KEY=<从 .env 读取>
```

## 停止服务

```bash
docker-compose down
```

## 重置数据库

```bash
docker-compose down -v
```

> 执行 `-v` 会删除所有数据卷，数据库将被清空。

## 健康检查

```bash
docker-compose ps
```

确认所有容器状态为 `healthy` 后即可使用。

## 初始化脚本

`init.sql` 在 MySQL 容器首次启动时自动执行。表结构由 Spring Data JPA 管理（`ddl-auto=update`），此文件保留用于后续数据迁移或种子数据。
