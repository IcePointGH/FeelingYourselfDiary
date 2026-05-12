package com.diaryproject.backend.ai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 用户对话记忆画像 — 维护每个用户的个性化画像描述。
 * <p>
 * 每 5 轮完整对话后自动触发异步更新，调用大模型 重写画像内容。
 * 该内容在后续对话中被注入到 system prompt 中，使 AI 能记住用户的长期特征。
 * </p>
 *
 * <pre>
 * -- 建表 SQL（因 ddl-auto=validate，需手动执行）:
 * CREATE TABLE IF NOT EXISTS user_memory (
 *   id BIGINT AUTO_INCREMENT PRIMARY KEY,
 *   user_id BIGINT NOT NULL UNIQUE,
 *   content TEXT,
 *   version BIGINT NOT NULL DEFAULT 0,
 *   exchange_count INT NOT NULL DEFAULT 0,
 *   created_at DATETIME,
 *   updated_at DATETIME,
 *   INDEX idx_user_memory_user_id (user_id)
 * );
 * </pre>
 */
@Entity
@Table(name = "user_memory", indexes = {
        @Index(name = "idx_user_memory_user_id", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMemory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属用户 ID（唯一） */
    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    /** 用户画像内容（Markdown 格式文本） */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** 乐观锁版本号 */
    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    /** 已统计的对话轮次计数 */
    @Column(name = "exchange_count", nullable = false)
    @Builder.Default
    private int exchangeCount = 0;

    /** 创建时间 */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
