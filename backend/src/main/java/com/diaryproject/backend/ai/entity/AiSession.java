package com.diaryproject.backend.ai.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_sessions", indexes = {
        @Index(name = "idx_ai_sessions_user_id", columnList = "user_id"),
        @Index(name = "idx_ai_sessions_user_status", columnList = "user_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 会话类型: chat / range / full */
    @Column(name = "session_type", nullable = false)
    private String sessionType;

    /** 会话标题 */
    @Column(nullable = false)
    private String title;

    /** 会话状态: active / completed */
    @Column(nullable = false)
    private String status;

    /** 进度百分比: 0-100 */
    @Column(nullable = false)
    @Builder.Default
    private Integer progress = 0;

    /** 创建时间 */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

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
