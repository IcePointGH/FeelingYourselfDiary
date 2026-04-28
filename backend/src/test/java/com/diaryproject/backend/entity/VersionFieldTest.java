package com.diaryproject.backend.entity;

import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.settings.entity.UserSettings;
import jakarta.persistence.Version;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

class VersionFieldTest {

    @Test
    void userHasVersionField() throws Exception {
        Field versionField = User.class.getDeclaredField("version");
        assertEquals(Long.class, versionField.getType());
        assertTrue(versionField.isAnnotationPresent(Version.class));

        User user = new User();
        versionField.setAccessible(true);
        assertEquals(0L, versionField.get(user));
    }

    @Test
    void scheduleHasVersionField() throws Exception {
        Field versionField = Schedule.class.getDeclaredField("version");
        assertEquals(Long.class, versionField.getType());
        assertTrue(versionField.isAnnotationPresent(Version.class));

        Schedule schedule = new Schedule();
        versionField.setAccessible(true);
        assertEquals(0L, versionField.get(schedule));
    }

    @Test
    void diaryHasVersionField() throws Exception {
        Field versionField = Diary.class.getDeclaredField("version");
        assertEquals(Long.class, versionField.getType());
        assertTrue(versionField.isAnnotationPresent(Version.class));

        Diary diary = new Diary();
        versionField.setAccessible(true);
        assertEquals(0L, versionField.get(diary));
    }

    @Test
    void userSettingsHasVersionField() throws Exception {
        Field versionField = UserSettings.class.getDeclaredField("version");
        assertEquals(Long.class, versionField.getType());
        assertTrue(versionField.isAnnotationPresent(Version.class));

        UserSettings settings = new UserSettings();
        versionField.setAccessible(true);
        assertEquals(0L, versionField.get(settings));
    }
}
