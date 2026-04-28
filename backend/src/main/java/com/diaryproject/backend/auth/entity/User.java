package com.diaryproject.backend.auth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户登录账号，唯一标识 */
    @Column(unique = true, nullable = false)
    private String username;

    /** BCrypt 加密后的密码 */
    @Column(nullable = false)
    private String password;

    /** 显示名称，可自定义 */
    private String nickname;

    /** 头像 URL */
    private String avatar;

    /** 个人签名 */
    private String signature;

    /** 账户创建时间 */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
