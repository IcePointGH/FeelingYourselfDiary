package com.diaryproject.backend.analysis.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

/**
 * Projection DTO for daily feeling totals aggregated by date.
 * Used by ScheduleRepository JPQL GROUP BY queries to return
 * per-date sum of feeling values instead of fetching all rows.
 */
@Data
@AllArgsConstructor
public class DateFeelingTotal {
    private LocalDate date;
    private Long totalFeeling;
}
