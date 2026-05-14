package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.StructuredReportDTO;
import com.diaryproject.backend.ai.exception.StructuredReportException;
import com.diaryproject.backend.ai.validation.StructuredReportValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * 结构化报告解析器 — 将 AI 返回的 JSON 解析为 {@link StructuredReportDTO.StructuredReport} 并校验。
 */
@Service
public class StructuredReportParser {

    private static final Logger log = LoggerFactory.getLogger(StructuredReportParser.class);

    private final ObjectMapper objectMapper;
    private final StructuredReportValidator validator;

    public StructuredReportParser() {
        this.objectMapper = new ObjectMapper();
        this.validator = new StructuredReportValidator();
    }

    /**
     * 解析并校验 AI 返回的 JSON。
     *
     * @param jsonResponse      AI 返回的原始 JSON 字符串
     * @param validScheduleIds  数据范围内的有效 schedule ID 集合
     * @param validDiaryIds     数据范围内的有效 diary ID 集合
     * @return 校验通过的 StructuredReport
     * @throws StructuredReportException 解析失败或校验未通过
     */
    public StructuredReportDTO.StructuredReport parseAndValidate(String jsonResponse,
                                                                  Set<Long> validScheduleIds,
                                                                  Set<Long> validDiaryIds) {
        if (jsonResponse == null || jsonResponse.isBlank()) {
            throw new StructuredReportException("AI returned empty response");
        }

        // Extract JSON from possible markdown code block
        String json = extractJson(jsonResponse);

        StructuredReportDTO.StructuredReport report;
        try {
            report = objectMapper.readValue(json, StructuredReportDTO.StructuredReport.class);
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON response: {}", e.getMessage());
            throw new StructuredReportException("Failed to parse AI response as JSON: " + e.getMessage(), e);
        }

        // Validate
        List<String> errors = validator.validate(report, validScheduleIds, validDiaryIds);
        if (!errors.isEmpty()) {
            String errorDetail = String.join("; ", errors);
            log.warn("Structured report validation failed: {}", errorDetail);
            throw new StructuredReportException("Report validation failed: " + errorDetail);
        }

        return report;
    }

    /**
     * 从 AI 响应中提取 JSON 内容。
     * 处理可能被 Markdown 代码块包裹的 JSON。
     */
    String extractJson(String response) {
        String trimmed = response.trim();

        // Try to find JSON between ```json ... ``` markers
        int jsonStart = trimmed.indexOf("```json");
        if (jsonStart >= 0) {
            int contentStart = trimmed.indexOf('\n', jsonStart);
            if (contentStart < 0) contentStart = trimmed.indexOf('\r', jsonStart);
            if (contentStart >= 0) {
                int jsonEnd = trimmed.indexOf("```", contentStart);
                if (jsonEnd > contentStart) {
                    return trimmed.substring(contentStart, jsonEnd).trim();
                }
            }
        }

        // Try to find JSON between ``` ... ``` markers (without language tag)
        int codeStart = trimmed.indexOf("```");
        if (codeStart >= 0) {
            int contentStart = trimmed.indexOf('\n', codeStart);
            if (contentStart < 0) contentStart = trimmed.indexOf('\r', codeStart);
            if (contentStart >= 0) {
                int codeEnd = trimmed.indexOf("```", contentStart);
                if (codeEnd > contentStart) {
                    return trimmed.substring(contentStart, codeEnd).trim();
                }
            }
        }

        // Try to find the first { and last }
        int braceStart = trimmed.indexOf('{');
        int braceEnd = trimmed.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            return trimmed.substring(braceStart, braceEnd + 1).trim();
        }

        return trimmed;
    }
}
