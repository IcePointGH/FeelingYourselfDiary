package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.schedule.entity.Schedule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Deep module: splits large schedule/diary datasets into token-budgeted chunks
 * for AI analysis. Pure function — no injected dependencies.
 *
 * <p>Token estimation uses conservative Chinese character heuristic:
 * each character ≈ 1.5 tokens, so totalChars / 1.5 ≈ estimated tokens.</p>
 *
 * <p>Each chunk contains a contiguous subset of schedules and diaries
 * whose combined estimated token count stays under the specified budget,
 * leaving room for system prompt + response tokens.</p>
 */
@Service
public class HistoryChunkingService {

    private static final Logger log = LoggerFactory.getLogger(HistoryChunkingService.class);
    private static final double CHARS_PER_TOKEN = 1.5;

    /**
     * Split schedules and diaries into token-budgeted chunks.
     *
     * @param schedules  all user schedules sorted by date (will be sorted if not)
     * @param diaries    all user diaries sorted by date (will be sorted if not)
     * @param maxTokens  max estimated tokens per chunk
     * @return list of chunks, empty if both inputs are empty
     */
    public List<Chunk> chunk(List<Schedule> schedules, List<Diary> diaries, int maxTokens) {
        if ((schedules == null || schedules.isEmpty()) && (diaries == null || diaries.isEmpty())) {
            log.debug("chunk() called with empty input — returning empty list");
            return Collections.emptyList();
        }

        // Normalize nulls
        List<Schedule> safeSchedules = schedules != null ? schedules : Collections.emptyList();
        List<Diary> safeDiaries = diaries != null ? diaries : Collections.emptyList();

        // Ensure both lists are sorted by date ascending for deterministic chunking
        List<Schedule> sortedSchedules = new ArrayList<>(safeSchedules);
        sortedSchedules.sort(Comparator.comparing(Schedule::getDate));
        List<Diary> sortedDiaries = new ArrayList<>(safeDiaries);
        sortedDiaries.sort(Comparator.comparing(Diary::getDate));

        List<Chunk> result = new ArrayList<>();
        ChunkBuilder current = new ChunkBuilder();

        // Merge schedules and diaries into chronological order using a two-pointer approach
        int si = 0, di = 0;
        while (si < sortedSchedules.size() || di < sortedDiaries.size()) {
            boolean takeSchedule;
            if (si >= sortedSchedules.size()) {
                takeSchedule = false;
            } else if (di >= sortedDiaries.size()) {
                takeSchedule = true;
            } else {
                takeSchedule = !sortedSchedules.get(si).getDate()
                        .isAfter(sortedDiaries.get(di).getDate());
            }

            if (takeSchedule) {
                Schedule s = sortedSchedules.get(si++);
                int tokens = estimateTokens(s);
                if (!current.canAdd(tokens, maxTokens)) {
                    result.add(current.build());
                    current = new ChunkBuilder();
                }
                current.addSchedule(s, tokens);
            } else {
                Diary d = sortedDiaries.get(di++);
                int tokens = estimateTokens(d);
                if (!current.canAdd(tokens, maxTokens)) {
                    result.add(current.build());
                    current = new ChunkBuilder();
                }
                current.addDiary(d, tokens);
            }
        }

        // Don't forget the last chunk
        if (!current.isEmpty()) {
            result.add(current.build());
        }

        log.debug("chunk() produced {} chunks from {} schedules and {} diaries (maxTokens={})",
                result.size(), safeSchedules.size(), safeDiaries.size(), maxTokens);

        return result;
    }

    /**
     * Estimate token count for a Schedule item.
     * Based on: title + date string + time + feeling + description.
     */
    int estimateTokens(Schedule s) {
        int chars = 0;
        if (s.getTitle() != null) chars += s.getTitle().length();
        if (s.getDate() != null) chars += s.getDate().toString().length(); // "2024-01-01" = 10
        if (s.getTime() != null) chars += s.getTime().toString().length();
        if (s.getFeeling() != null) chars += s.getFeeling().toString().length();
        if (s.getDescription() != null) chars += s.getDescription().length();
        return Math.max(1, (int) Math.ceil(chars / CHARS_PER_TOKEN));
    }

    /**
     * Estimate token count for a Diary item.
     * Based on: title + date string + content.
     */
    int estimateTokens(Diary d) {
        int chars = 0;
        if (d.getTitle() != null) chars += d.getTitle().length();
        if (d.getDate() != null) chars += d.getDate().toString().length();
        if (d.getContent() != null) chars += d.getContent().length();
        return Math.max(1, (int) Math.ceil(chars / CHARS_PER_TOKEN));
    }

    /**
     * A single chunk of analysis data. Contains schedules + diaries within
     * a contiguous date range, with estimated token count.
     */
    public static class Chunk {
        private final List<Schedule> schedules;
        private final List<Diary> diaries;
        private final int estimatedTokens;
        private final String dateRange;

        Chunk(List<Schedule> schedules, List<Diary> diaries, int estimatedTokens, String dateRange) {
            this.schedules = schedules;
            this.diaries = diaries;
            this.estimatedTokens = estimatedTokens;
            this.dateRange = dateRange;
        }

        public List<Schedule> getSchedules() { return schedules; }
        public List<Diary> getDiaries() { return diaries; }
        public int getEstimatedTokens() { return estimatedTokens; }
        public String getDateRange() { return dateRange; }
    }

    /**
     * Internal builder for incrementally constructing a Chunk.
     */
    private static class ChunkBuilder {
        private final List<Schedule> schedules = new ArrayList<>();
        private final List<Diary> diaries = new ArrayList<>();
        private int totalTokens = 0;
        private LocalDate firstDate = null;
        private LocalDate lastDate = null;

        boolean canAdd(int itemTokens, int maxTokens) {
            // Always allow adding if chunk is empty (graceful overflow for oversized items)
            return isEmpty() || (totalTokens + itemTokens <= maxTokens);
        }

        void addSchedule(Schedule s, int tokens) {
            schedules.add(s);
            totalTokens += tokens;
            updateDateRange(s.getDate());
        }

        void addDiary(Diary d, int tokens) {
            diaries.add(d);
            totalTokens += tokens;
            updateDateRange(d.getDate());
        }

        boolean isEmpty() {
            return schedules.isEmpty() && diaries.isEmpty();
        }

        Chunk build() {
            String range;
            if (firstDate != null && lastDate != null) {
                range = firstDate + " ~ " + lastDate;
            } else {
                range = "";
            }
            return new Chunk(
                    new ArrayList<>(schedules),
                    new ArrayList<>(diaries),
                    totalTokens,
                    range
            );
        }

        private void updateDateRange(LocalDate date) {
            if (date == null) return;
            if (firstDate == null || date.isBefore(firstDate)) {
                firstDate = date;
            }
            if (lastDate == null || date.isAfter(lastDate)) {
                lastDate = date;
            }
        }
    }
}
