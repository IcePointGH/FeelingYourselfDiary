package com.diaryproject.backend.diary.repository;

import com.diaryproject.backend.diary.entity.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiaryRepository extends JpaRepository<Diary, Long> {
    List<Diary> findByUserIdAndDateOrderByCreatedAtDesc(Long userId, LocalDate date);
    List<Diary> findByUserIdOrderByDateDesc(Long userId);
    Page<Diary> findByUserId(Long userId, Pageable pageable);
    Optional<Diary> findByUserIdAndId(Long userId, Long id);
    void deleteByUserIdAndId(Long userId, Long id);
}
