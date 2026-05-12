package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.schedule.entity.Schedule;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for HistoryChunkingService. Pure Mockito — no Spring context.
 */
class HistoryChunkingServiceTest {

    private final HistoryChunkingService service = new HistoryChunkingService();

    @Test
    void chunk_emptyInput_returnsEmptyList() {
        List<HistoryChunkingService.Chunk> result = service.chunk(
                Collections.emptyList(), Collections.emptyList(), 2500);
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void chunk_singleChunk_fitsInBudget() {
        Schedule schedule = Schedule.builder()
                .id(1L)
                .userId(1L)
                .title("晨会")
                .description("团队晨会")
                .date(LocalDate.of(2024, 1, 1))
                .time(LocalTime.of(10, 0))
                .feeling(2)
                .build();
        Diary diary = Diary.builder()
                .id(1L)
                .userId(1L)
                .title("新年第一天")
                .content("今天是新年第一天，感觉不错。")
                .date(LocalDate.of(2024, 1, 1))
                .build();

        List<HistoryChunkingService.Chunk> result = service.chunk(
                List.of(schedule), List.of(diary), 2500);

        assertEquals(1, result.size());
        HistoryChunkingService.Chunk chunk = result.get(0);
        assertEquals(1, chunk.getSchedules().size());
        assertEquals(1, chunk.getDiaries().size());
        assertTrue(chunk.getEstimatedTokens() > 0);
        assertTrue(chunk.getEstimatedTokens() <= 2500);
        assertNotNull(chunk.getDateRange());
    }

    @Test
    void chunk_multipleSchedulesAndDiaries_createsMultipleChunks() {
        // Create enough data to overflow maxTokens (use small budget)
        List<Schedule> schedules = List.of(
                Schedule.builder().id(1L).userId(1L).title("日程1").description("a".repeat(200)).date(LocalDate.of(2024, 1, 1)).feeling(1).build(),
                Schedule.builder().id(2L).userId(1L).title("日程2").description("a".repeat(200)).date(LocalDate.of(2024, 1, 2)).feeling(2).build(),
                Schedule.builder().id(3L).userId(1L).title("日程3").description("a".repeat(200)).date(LocalDate.of(2024, 1, 3)).feeling(3).build()
        );
        List<Diary> diaries = List.of(
                Diary.builder().id(1L).userId(1L).title("日记1").content("a".repeat(300)).date(LocalDate.of(2024, 1, 1)).build(),
                Diary.builder().id(2L).userId(1L).title("日记2").content("a".repeat(300)).date(LocalDate.of(2024, 1, 2)).build()
        );

        // Use small maxTokens to force multiple chunks
        List<HistoryChunkingService.Chunk> result = service.chunk(schedules, diaries, 200);

        assertTrue(result.size() >= 2);
        // Verify date ranges are set
        for (HistoryChunkingService.Chunk chunk : result) {
            assertNotNull(chunk.getDateRange());
        }
    }

    @Test
    void chunk_diaryOnly_noSchedule() {
        List<Diary> diaries = List.of(
                Diary.builder().id(1L).userId(1L).title("日记1").content("今天过得不错。").date(LocalDate.of(2024, 2, 1)).build(),
                Diary.builder().id(2L).userId(1L).title("日记2").content("有点累。").date(LocalDate.of(2024, 2, 2)).build()
        );

        List<HistoryChunkingService.Chunk> result = service.chunk(
                Collections.emptyList(), diaries, 2500);

        assertEquals(1, result.size());
        HistoryChunkingService.Chunk chunk = result.get(0);
        assertTrue(chunk.getSchedules().isEmpty());
        assertEquals(2, chunk.getDiaries().size());
    }

    @Test
    void chunk_scheduleOnly_noDiary() {
        List<Schedule> schedules = List.of(
                Schedule.builder().id(1L).userId(1L).title("跑步").description("晨跑5公里").date(LocalDate.of(2024, 3, 1)).time(LocalTime.of(7, 0)).feeling(3).build()
        );

        List<HistoryChunkingService.Chunk> result = service.chunk(
                schedules, Collections.emptyList(), 2500);

        assertEquals(1, result.size());
        HistoryChunkingService.Chunk chunk = result.get(0);
        assertEquals(1, chunk.getSchedules().size());
        assertTrue(chunk.getDiaries().isEmpty());
    }

    @Test
    void chunk_singleItemExceedsLimit_stillReturned() {
        // One diary with very large content that exceeds maxTokens
        Diary largeDiary = Diary.builder()
                .id(1L).userId(1L)
                .title("超长日记")
                .content("x".repeat(5000))  // ~5000 chars → ~3333 tokens
                .date(LocalDate.of(2024, 4, 1))
                .build();

        List<HistoryChunkingService.Chunk> result = service.chunk(
                Collections.emptyList(), List.of(largeDiary), 500);

        assertEquals(1, result.size());
        HistoryChunkingService.Chunk chunk = result.get(0);
        assertEquals(1, chunk.getDiaries().size());
        // The estimated tokens may exceed maxTokens — that's the graceful overflow
        assertTrue(chunk.getEstimatedTokens() > 0);
    }
}
