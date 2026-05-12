package com.diaryproject.backend.ai.repository;

import com.diaryproject.backend.ai.entity.UserMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 用户记忆画像数据访问接口。
 */
@Repository
public interface UserMemoryRepository extends JpaRepository<UserMemory, Long> {

    /**
     * 根据用户 ID 查询记忆画像（每个用户至多一条记录）
     */
    Optional<UserMemory> findByUserId(Long userId);
}
