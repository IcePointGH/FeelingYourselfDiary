package com.diaryproject.backend.settings.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "user_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属用户 ID，唯一 */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 情绪标签配置，JSON 格式字符串 */
    @Column(name = "emotion_labels", length = 2000)
    private String emotionLabels;

    /** 是否自动保存心情，默认 false */
    @Column(name = "auto_save_thoughts")
    private Boolean autoSaveThoughts = false;

    /** 主题配色方案，默认 morandi */
    @Column(nullable = false)
    private String theme = "morandi";
}
