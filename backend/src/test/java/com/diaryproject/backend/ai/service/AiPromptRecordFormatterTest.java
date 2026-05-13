package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.schedule.entity.Schedule;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AiPromptRecordFormatterTest {

    private final AiPromptRecordFormatter formatter = new AiPromptRecordFormatter();

    @Test
    void feelingLabel_mapsKnownMoodValues() {
        assertEquals("极差", formatter.feelingLabel(-3));
        assertEquals("较差", formatter.feelingLabel(-2));
        assertEquals("略差", formatter.feelingLabel(-1));
        assertEquals("一般", formatter.feelingLabel(0));
        assertEquals("略好", formatter.feelingLabel(1));
        assertEquals("较好", formatter.feelingLabel(2));
        assertEquals("极好", formatter.feelingLabel(3));
        assertEquals("未知", formatter.feelingLabel(99));
    }

    @Test
    void formatAnalysisRecords_includesSchedulesAndDiaries() {
        String result = formatter.formatAnalysisRecords(
                List.of(schedule()),
                List.of(diary()));

        assertTrue(result.startsWith("以下是我在指定时间范围内的记录，请帮我分析："));
        assertTrue(result.contains("===== 日程记录 ====="));
        assertTrue(result.contains("【2026-05-13】 09:30"));
        assertTrue(result.contains("标题：晨间散步"));
        assertTrue(result.contains("情绪：2 (较好)"));
        assertTrue(result.contains("描述：空气很好"));
        assertTrue(result.contains("===== 日记记录 ====="));
        assertTrue(result.contains("标题：回顾"));
        assertTrue(result.contains("内容：今天状态不错"));
    }

    @Test
    void formatContextRecord_includesTagAndSingleRecord() {
        AiSessionSchedule entry = AiSessionSchedule.builder()
                .id(1L)
                .sessionId(10L)
                .scheduleId(20L)
                .tag("重要")
                .build();

        String result = formatter.formatContextRecord(entry, schedule(), null);

        assertTrue(result.startsWith("【标签：重要】"));
        assertTrue(result.contains("【2026-05-13】 09:30"));
        assertTrue(result.contains("标题：晨间散步"));
        assertTrue(result.contains("情绪：2 (较好)"));
    }

    private Schedule schedule() {
        return Schedule.builder()
                .id(20L)
                .userId(1L)
                .title("晨间散步")
                .description("空气很好")
                .date(LocalDate.of(2026, 5, 13))
                .time(LocalTime.of(9, 30))
                .feeling(2)
                .build();
    }

    private Diary diary() {
        return Diary.builder()
                .id(30L)
                .userId(1L)
                .title("回顾")
                .content("今天状态不错")
                .date(LocalDate.of(2026, 5, 13))
                .build();
    }
}
