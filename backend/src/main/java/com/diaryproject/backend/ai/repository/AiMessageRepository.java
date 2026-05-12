package com.diaryproject.backend.ai.repository;

import com.diaryproject.backend.ai.entity.AiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiMessageRepository extends JpaRepository<AiMessage, Long> {

    List<AiMessage> findBySessionIdOrderBySequenceNumAsc(Long sessionId);
}
