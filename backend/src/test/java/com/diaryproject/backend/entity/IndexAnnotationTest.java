package com.diaryproject.backend.entity;

import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.schedule.entity.Schedule;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class IndexAnnotationTest {

    @Test
    void scheduleTableHasCorrectIndexes() {
        Table table = Schedule.class.getAnnotation(Table.class);
        assertNotNull(table);
        Index[] indexes = table.indexes();
        assertEquals(2, indexes.length);

        boolean hasUserDate = false;
        boolean hasUserId = false;
        for (Index idx : indexes) {
            if ("idx_schedules_user_date".equals(idx.name())) {
                assertEquals("user_id, date", idx.columnList());
                hasUserDate = true;
            }
            if ("idx_schedules_user_id".equals(idx.name())) {
                assertEquals("user_id", idx.columnList());
                hasUserId = true;
            }
        }
        assertTrue(hasUserDate, "Missing idx_schedules_user_date");
        assertTrue(hasUserId, "Missing idx_schedules_user_id");
    }

    @Test
    void diaryTableHasCorrectIndexes() {
        Table table = Diary.class.getAnnotation(Table.class);
        assertNotNull(table);
        Index[] indexes = table.indexes();
        assertEquals(2, indexes.length);

        boolean hasUserDate = false;
        boolean hasUserId = false;
        for (Index idx : indexes) {
            if ("idx_diaries_user_date".equals(idx.name())) {
                assertEquals("user_id, date", idx.columnList());
                hasUserDate = true;
            }
            if ("idx_diaries_user_id".equals(idx.name())) {
                assertEquals("user_id", idx.columnList());
                hasUserId = true;
            }
        }
        assertTrue(hasUserDate, "Missing idx_diaries_user_date");
        assertTrue(hasUserId, "Missing idx_diaries_user_id");
    }
}
