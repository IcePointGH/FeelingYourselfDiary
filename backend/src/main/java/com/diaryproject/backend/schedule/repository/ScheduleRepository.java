package com.diaryproject.backend.schedule.repository;

import com.diaryproject.backend.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByUserIdAndDateOrderByTimeAsc(Long userId, LocalDate date);
    List<Schedule> findByUserIdAndDateBetweenOrderByDateAscTimeAsc(Long userId, LocalDate start, LocalDate end);
    List<Schedule> findByUserIdOrderByDateDescTimeDesc(Long userId);
    void deleteByUserIdAndId(Long userId, Long id);
}
