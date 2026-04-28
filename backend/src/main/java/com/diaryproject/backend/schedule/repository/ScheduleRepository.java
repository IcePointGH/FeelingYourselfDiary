package com.diaryproject.backend.schedule.repository;

import com.diaryproject.backend.analysis.dto.DateFeelingTotal;
import com.diaryproject.backend.schedule.entity.Schedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByUserIdAndDateOrderByTimeAsc(Long userId, LocalDate date);
    List<Schedule> findByUserIdAndDateBetweenOrderByDateAscTimeAsc(Long userId, LocalDate start, LocalDate end);
    List<Schedule> findByUserIdOrderByDateDescTimeDesc(Long userId);
    Page<Schedule> findByUserId(Long userId, Pageable pageable);
    void deleteByUserIdAndId(Long userId, Long id);

    /**
     * Aggregate daily feeling totals for a user within a date range, grouped by date.
     * Returns one row per date with the sum of feeling values for that day.
     * Used by AnalysisService to replace in-memory date-by-date aggregation.
     *
     * @param userId user ID
     * @param start  range start (inclusive)
     * @param end    range end (inclusive)
     * @return list of per-date feeling totals, ordered by date ascending
     */
    @Query("SELECT new com.diaryproject.backend.analysis.dto.DateFeelingTotal(s.date, SUM(s.feeling)) " +
           "FROM Schedule s WHERE s.userId = :userId AND s.date BETWEEN :start AND :end " +
           "GROUP BY s.date ORDER BY s.date")
    List<DateFeelingTotal> findDailyFeelingTotalsByUserIdAndDateBetween(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
