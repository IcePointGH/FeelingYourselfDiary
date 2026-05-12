package com.diaryproject.backend.ai.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "ai_session_schedules", indexes = {
        @Index(name = "idx_ai_session_schedules_session_id", columnList = "session_id"),
        @Index(name = "idx_ai_session_schedules_schedule_id", columnList = "schedule_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_session_schedule", columnNames = {"session_id", "schedule_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiSessionSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属会话 ID */
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /** 关联日程 ID（可为空） */
    @Column(name = "schedule_id")
    private Long scheduleId;

    /** 关联日记 ID（保留字段） */
    @Column(name = "diary_id")
    private Long diaryId;

    /** 用户自定义标签 */
    @Column(name = "tag")
    private String tag;
}
