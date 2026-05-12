package com.diaryproject.backend.ai.repository;

import com.diaryproject.backend.ai.entity.AiSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiSessionRepository extends JpaRepository<AiSession, Long> {

    List<AiSession> findByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<AiSession> findByUserIdAndId(Long userId, Long id);

    void deleteByUserIdAndId(Long userId, Long id);
}
