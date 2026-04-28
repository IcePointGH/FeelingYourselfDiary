package com.diaryproject.backend.schedule.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "schedules", indexes = {
        @Index(name = "idx_schedules_user_date", columnList = "user_id, date"),
        @Index(name = "idx_schedules_user_id", columnList = "user_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 日程标题 */
    @Column(nullable = false)
    private String title;

    /** 日程详细描述 */
    @Column(length = 2000)
    private String description;

    /** 所属日期 */
    @Column(nullable = false)
    private LocalDate date;

    /** 具体时间，可为空 */
    private LocalTime time;

    /** 情绪指数，1-5 */
    @Column(nullable = false)
    private Integer feeling;

    /** 所属用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 创建时间 */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
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
