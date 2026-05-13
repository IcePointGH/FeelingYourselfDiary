package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSessionSchedule;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.schedule.entity.Schedule;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class AiPromptRecordFormatter {

    public String formatAnalysisRecords(List<Schedule> schedules, List<Diary> diaries) {
        List<Schedule> safeSchedules = schedules != null ? schedules : Collections.emptyList();
        List<Diary> safeDiaries = diaries != null ? diaries : Collections.emptyList();

        StringBuilder sb = new StringBuilder();
        sb.append("以下是我在指定时间范围内的记录，请帮我分析：\n\n");

        if (!safeSchedules.isEmpty()) {
            sb.append("===== 日程记录 =====\n");
            for (Schedule schedule : safeSchedules) {
                appendSchedule(sb, schedule);
            }
        }

        if (!safeDiaries.isEmpty()) {
            sb.append("===== 日记记录 =====\n");
            for (Diary diary : safeDiaries) {
                appendDiary(sb, diary);
            }
        }

        return sb.toString();
    }

    public String formatContextRecord(AiSessionSchedule entry, Schedule schedule, Diary diary) {
        StringBuilder sb = new StringBuilder();
        if (entry.getTag() != null && !entry.getTag().isBlank()) {
            sb.append("【标签：").append(entry.getTag()).append("】\n");
        }

        if (schedule != null) {
            appendSchedule(sb, schedule);
        } else if (diary != null) {
            appendDiary(sb, diary);
        }

        return sb.toString();
    }

    public String feelingLabel(int feeling) {
        return switch (feeling) {
            case -3 -> "极差";
            case -2 -> "较差";
            case -1 -> "略差";
            case 0 -> "一般";
            case 1 -> "略好";
            case 2 -> "较好";
            case 3 -> "极好";
            default -> "未知";
        };
    }

    private void appendSchedule(StringBuilder sb, Schedule schedule) {
        sb.append("【").append(schedule.getDate()).append("】");
        if (schedule.getTime() != null) {
            sb.append(" ").append(schedule.getTime());
        }
        sb.append("\n  标题：").append(schedule.getTitle());
        sb.append("\n  情绪：").append(schedule.getFeeling()).append(" (").append(feelingLabel(schedule.getFeeling())).append(")");
        if (schedule.getDescription() != null && !schedule.getDescription().isBlank()) {
            sb.append("\n  描述：").append(schedule.getDescription());
        }
        sb.append("\n\n");
    }

    private void appendDiary(StringBuilder sb, Diary diary) {
        sb.append("【").append(diary.getDate()).append("】");
        sb.append("\n  标题：").append(diary.getTitle());
        sb.append("\n  内容：").append(diary.getContent());
        sb.append("\n\n");
    }
}
