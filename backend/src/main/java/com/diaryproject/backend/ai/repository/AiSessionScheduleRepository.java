package com.diaryproject.backend.ai.repository;

import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiSessionScheduleRepository extends JpaRepository<AiSessionSchedule, Long> {

    List<AiSessionSchedule> findBySessionId(Long sessionId);
}
