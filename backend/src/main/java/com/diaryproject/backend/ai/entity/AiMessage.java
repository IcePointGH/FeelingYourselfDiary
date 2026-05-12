package com.diaryproject.backend.ai.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_messages", indexes = {
        @Index(name = "idx_ai_messages_session_id", columnList = "session_id"),
        @Index(name = "idx_ai_messages_session_seq", columnList = "session_id, sequence_num")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属会话 ID */
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /** 角色: system / user / assistant */
    @Column(nullable = false)
    private String role;

    /** 消息内容 */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /** 会话内序号，用于排序 */
    @Column(name = "sequence_num", nullable = false)
    private Integer sequenceNum;

    /** 创建时间 */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
