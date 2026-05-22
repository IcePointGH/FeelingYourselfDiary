package com.diaryproject.backend.ai.repository;

import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiSessionScheduleRepository extends JpaRepository<AiSessionSchedule, Long> {

    List<AiSessionSchedule> findBySessionId(Long sessionId);

    Optional<AiSessionSchedule> findBySessionIdAndScheduleId(Long sessionId, Long scheduleId);

    List<AiSessionSchedule> findBySessionIdAndScheduleIdIsNotNull(Long sessionId);

    List<AiSessionSchedule> findBySessionIdAndDiaryIdIsNotNull(Long sessionId);

    @Modifying
    @Query("""
            DELETE FROM AiSessionSchedule ss
            WHERE ss.sessionId IN (
                SELECT s.id FROM AiSession s WHERE s.userId = :userId
            )
            """)
    void deleteByUserId(@Param("userId") Long userId);
}
