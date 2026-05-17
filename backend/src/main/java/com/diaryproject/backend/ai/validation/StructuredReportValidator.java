package com.diaryproject.backend.ai.validation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.diaryproject.backend.ai.dto.StructuredReportDTO;

/**
 * 结构化报告手动校验器（匹配项目风格 — 无 Bean Validation 依赖）。
 */
public class StructuredReportValidator {

    private static final Set<String> VALID_TONES = Set.of("positive", "stable", "mixed", "low");
    private static final Set<String> VALID_DIRECTIONS = Set.of("up", "down", "flat", "slightly_up", "slightly_down", "mixed");
    private static final Set<String> VALID_VOLATILITIES = Set.of("low", "medium", "high");
    private static final Set<String> VALID_TURNING_TYPES = Set.of("high", "low", "shift", "recovery");
    private static final Set<String> VALID_DIFFICULTIES = Set.of("easy", "medium", "hard");

    /**
     * 校验结构化报告。返回空列表表示通过。
     */
    public List<String> validate(StructuredReportDTO.StructuredReport report,
                                  Set<Long> validScheduleIds,
                                  Set<Long> validDiaryIds) {
        List<String> errors = new ArrayList<>();

        if (report == null) {
            errors.add("report is null");
            return errors;
        }

        // title
        if (isNullOrBlank(report.getTitle())) {
            errors.add("report.title is required");
        } else if (report.getTitle().length() > 60) {
            errors.add("report.title exceeds 60 characters: " + report.getTitle().length());
        }

        // overview
        if (report.getOverview() == null) {
            errors.add("report.overview is required");
        } else {
            validateOverview(report.getOverview(), errors);
        }

        // trend
        if (report.getTrend() == null) {
            errors.add("report.trend is required");
        } else {
            validateTrend(report.getTrend(), errors);
        }

        // patterns (0-4)
        if (report.getPatterns() != null) {
            if (report.getPatterns().size() > 4) {
                errors.add("report.patterns exceeds max 4: " + report.getPatterns().size());
            } else {
                for (int i = 0; i < report.getPatterns().size(); i++) {
                    validatePattern(report.getPatterns().get(i), i, validScheduleIds, validDiaryIds, errors);
                }
            }
        }

        // turningPoints (0-5)
        if (report.getTurningPoints() != null) {
            if (report.getTurningPoints().size() > 5) {
                errors.add("report.turningPoints exceeds max 5: " + report.getTurningPoints().size());
            } else {
                for (int i = 0; i < report.getTurningPoints().size(); i++) {
                    validateTurningPoint(report.getTurningPoints().get(i), i, validScheduleIds, validDiaryIds, errors);
                }
            }
        }

        // suggestions (1-4)
        if (report.getSuggestions() == null || report.getSuggestions().isEmpty()) {
            errors.add("report.suggestions must have 1-4 items");
        } else {
            if (report.getSuggestions().size() > 4) {
                errors.add("report.suggestions exceeds max 4: " + report.getSuggestions().size());
            } else {
                for (int i = 0; i < report.getSuggestions().size(); i++) {
                    validateSuggestion(report.getSuggestions().get(i), i, validScheduleIds, validDiaryIds, errors);
                }
            }
        }

        // gentleNote
        if (isNullOrBlank(report.getGentleNote())) {
            errors.add("report.gentleNote is required");
        } else if (report.getGentleNote().length() > 80) {
            errors.add("report.gentleNote exceeds 80 characters: " + report.getGentleNote().length());
        }

        return errors;
    }

    private void validateOverview(StructuredReportDTO.Overview overview, List<String> errors) {
        if (isNullOrBlank(overview.getHeadline())) {
            errors.add("overview.headline is required");
        } else if (overview.getHeadline().length() > 80) {
            errors.add("overview.headline exceeds 80 characters: " + overview.getHeadline().length());
        }

        if (isNullOrBlank(overview.getSummary())) {
            errors.add("overview.summary is required");
        } else if (overview.getSummary().length() > 240) {
            errors.add("overview.summary exceeds 240 characters: " + overview.getSummary().length());
        }

        if (overview.getTone() == null || !VALID_TONES.contains(overview.getTone())) {
            errors.add("overview.tone invalid: " + overview.getTone() + " (expected: " + VALID_TONES + ")");
        }
    }

    private void validateTrend(StructuredReportDTO.Trend trend, List<String> errors) {
        if (trend.getDirection() == null || !VALID_DIRECTIONS.contains(trend.getDirection())) {
            errors.add("trend.direction invalid: " + trend.getDirection() + " (expected: " + VALID_DIRECTIONS + ")");
        }

        if (trend.getVolatility() == null || !VALID_VOLATILITIES.contains(trend.getVolatility())) {
            errors.add("trend.volatility invalid: " + trend.getVolatility() + " (expected: " + VALID_VOLATILITIES + ")");
        }

        if (trend.getHighlights() != null) {
            if (trend.getHighlights().size() > 4) {
                errors.add("trend.highlights exceeds max 4: " + trend.getHighlights().size());
            } else {
                for (int i = 0; i < trend.getHighlights().size(); i++) {
                    String h = trend.getHighlights().get(i);
                    if (h != null && h.length() > 120) {
                        errors.add("trend.highlights[" + i + "] exceeds 120 characters: " + h.length());
                    }
                }
            }
        }
    }

    private void validatePattern(StructuredReportDTO.Pattern pattern, int idx,
                                  Set<Long> validScheduleIds, Set<Long> validDiaryIds,
                                  List<String> errors) {
        String prefix = "report.patterns[" + idx + "]";
        if (isNullOrBlank(pattern.getTitle())) {
            errors.add(prefix + ".title is required");
        } else if (pattern.getTitle().length() > 80) {
            errors.add(prefix + ".title exceeds 80 characters: " + pattern.getTitle().length());
        }

        if (isNullOrBlank(pattern.getDescription())) {
            errors.add(prefix + ".description is required");
        } else if (pattern.getDescription().length() > 220) {
            errors.add(prefix + ".description exceeds 220 characters: " + pattern.getDescription().length());
        }

        validateEvidenceIds(pattern.getScheduleIds(), prefix + ".scheduleIds", validScheduleIds, errors);
        validateEvidenceIds(pattern.getDiaryIds(), prefix + ".diaryIds", validDiaryIds, errors);
    }

    private void validateTurningPoint(StructuredReportDTO.TurningPoint tp, int idx,
                                       Set<Long> validScheduleIds, Set<Long> validDiaryIds,
                                       List<String> errors) {
        String prefix = "report.turningPoints[" + idx + "]";
        if (isNullOrBlank(tp.getDate())) {
            errors.add(prefix + ".date is required");
        }

        if (tp.getType() == null || !VALID_TURNING_TYPES.contains(tp.getType())) {
            errors.add(prefix + ".type invalid: " + tp.getType() + " (expected: " + VALID_TURNING_TYPES + ")");
        }

        if (isNullOrBlank(tp.getTitle())) {
            errors.add(prefix + ".title is required");
        } else if (tp.getTitle().length() > 80) {
            errors.add(prefix + ".title exceeds 80 characters: " + tp.getTitle().length());
        }

        if (isNullOrBlank(tp.getReason())) {
            errors.add(prefix + ".reason is required");
        } else if (tp.getReason().length() > 220) {
            errors.add(prefix + ".reason exceeds 220 characters: " + tp.getReason().length());
        }

        validateEvidenceIds(tp.getScheduleIds(), prefix + ".scheduleIds", validScheduleIds, errors);
        validateEvidenceIds(tp.getDiaryIds(), prefix + ".diaryIds", validDiaryIds, errors);
    }

    private void validateSuggestion(StructuredReportDTO.Suggestion suggestion, int idx,
                                     Set<Long> validScheduleIds, Set<Long> validDiaryIds,
                                     List<String> errors) {
        String prefix = "report.suggestions[" + idx + "]";
        if (isNullOrBlank(suggestion.getTitle())) {
            errors.add(prefix + ".title is required");
        } else if (suggestion.getTitle().length() > 80) {
            errors.add(prefix + ".title exceeds 80 characters: " + suggestion.getTitle().length());
        }

        if (isNullOrBlank(suggestion.getAction())) {
            errors.add(prefix + ".action is required");
        } else if (suggestion.getAction().length() > 220) {
            errors.add(prefix + ".action exceeds 220 characters: " + suggestion.getAction().length());
        }

        if (suggestion.getDifficulty() == null || !VALID_DIFFICULTIES.contains(suggestion.getDifficulty())) {
            errors.add(prefix + ".difficulty invalid: " + suggestion.getDifficulty() + " (expected: " + VALID_DIFFICULTIES + ")");
        }

        validateEvidenceIds(suggestion.getScheduleIds(), prefix + ".scheduleIds", validScheduleIds, errors);
        validateEvidenceIds(suggestion.getDiaryIds(), prefix + ".diaryIds", validDiaryIds, errors);
    }

    private void validateEvidenceIds(List<Long> ids, String fieldName,
                                      Set<Long> validIds, List<String> errors) {
        if (ids == null || ids.isEmpty()) {
            return;
        }

        // Deduplicate
        Set<Long> unique = new HashSet<>(ids);
        if (unique.size() != ids.size()) {
            // deduplicate silently in caller; for validation we just check existence
        }

        for (Long id : unique) {
            if (id != null && !validIds.contains(id)) {
                errors.add(fieldName + " contains invalid id: " + id);
            }
        }
    }

    private boolean isNullOrBlank(String s) {
        return s == null || s.isBlank();
    }

    /**
     * 校验证据摘要（用于单元测试和边界检查）。
     * 主要校验 feeling 范围 (-3 to 3) 等。
     */
    public List<String> validateEvidenceSummary(List<StructuredReportDTO.ScheduleEvidence> schedules,
                                                 List<StructuredReportDTO.DiaryEvidence> diaries) {
        List<String> errors = new ArrayList<>();

        if (schedules != null) {
            for (int i = 0; i < schedules.size(); i++) {
                StructuredReportDTO.ScheduleEvidence se = schedules.get(i);
                if (se.getFeeling() != null) {
                    if (se.getFeeling() < -3 || se.getFeeling() > 3) {
                        errors.add("schedule evidence[" + i + "].feeling out of range (-3 to 3): " + se.getFeeling());
                    }
                }
            }
        }

        if (diaries != null) {
            for (int i = 0; i < diaries.size(); i++) {
                StructuredReportDTO.DiaryEvidence de = diaries.get(i);
                if (de.getExcerpt() != null && de.getExcerpt().length() > 120) {
                    errors.add("diary evidence[" + i + "].excerpt exceeds 120 characters: " + de.getExcerpt().length());
                }
            }
        }

        return errors;
    }
}
