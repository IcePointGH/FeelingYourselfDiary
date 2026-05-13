-- 情绪平衡日记数据库初始化
-- ddl-auto=validate 环境下，所有表必须在此文件中手动创建
-- 此文件由 docker-compose 挂载到 MySQL 容器 /docker-entrypoint-initdb.d/

-- ===== 1. 用户表 =====
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at DATETIME(6) DEFAULT NULL,
    nickname VARCHAR(255) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    signature VARCHAR(255) DEFAULT NULL,
    username VARCHAR(255) NOT NULL,
    version BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY UKr43af9ap4edm43mmtq01oddj6 (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 2. 日程表 =====
CREATE TABLE IF NOT EXISTS schedules (
    id BIGINT NOT NULL AUTO_INCREMENT,
    completed BIT NOT NULL DEFAULT 1,
    created_at DATETIME(6) DEFAULT NULL,
    date DATE NOT NULL,
    description VARCHAR(2000) DEFAULT NULL,
    feeling INT NOT NULL,
    time TIME DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    user_id BIGINT NOT NULL,
    version BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_schedules_user_date (user_id, date),
    KEY idx_schedules_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 3. 日记表 =====
CREATE TABLE IF NOT EXISTS diaries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    content VARCHAR(5000) NOT NULL,
    created_at DATETIME(6) DEFAULT NULL,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    user_id BIGINT NOT NULL,
    version BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_diaries_user_date (user_id, date),
    KEY idx_diaries_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 4. 用户设置表 =====
CREATE TABLE IF NOT EXISTS user_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    auto_save_thoughts BIT(1) DEFAULT NULL,
    emotion_labels VARCHAR(2000) DEFAULT NULL,
    theme VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    version BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY UK4bos7satl9xeqd18frfeqg6tt (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 5. AI 会话表 =====
CREATE TABLE IF NOT EXISTS ai_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) DEFAULT NULL,
    progress INT NOT NULL,
    session_type VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    user_id BIGINT NOT NULL,
    diary_id BIGINT DEFAULT NULL,
    version BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ai_sessions_user_id (user_id),
    KEY idx_ai_sessions_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 6. AI 消息表 =====
CREATE TABLE IF NOT EXISTS ai_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME(6) DEFAULT NULL,
    role VARCHAR(255) NOT NULL,
    sequence_num INT NOT NULL,
    session_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ai_messages_session_id (session_id),
    KEY idx_ai_messages_session_seq (session_id, sequence_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 7. AI 上下文关联表 =====
CREATE TABLE IF NOT EXISTS ai_session_schedules (
    id BIGINT NOT NULL AUTO_INCREMENT,
    diary_id BIGINT DEFAULT NULL,
    tag VARCHAR(100) DEFAULT NULL,
    schedule_id BIGINT DEFAULT NULL,
    session_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_session_schedule (session_id, schedule_id),
    KEY idx_ai_session_schedules_session_id (session_id),
    KEY idx_ai_session_schedules_schedule_id (schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===== 8. 用户记忆画像表 =====
CREATE TABLE IF NOT EXISTS user_memory (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    content TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    exchange_count INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY user_id (user_id),
    KEY idx_user_memory_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
