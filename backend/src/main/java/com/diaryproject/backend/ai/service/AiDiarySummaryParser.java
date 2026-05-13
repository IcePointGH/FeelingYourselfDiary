package com.diaryproject.backend.ai.service;

import org.springframework.stereotype.Component;

@Component
public class AiDiarySummaryParser {

    private static final String DEFAULT_TITLE = "AI 对话总结";
    private static final int MAX_TITLE_LENGTH = 255;
    private static final int MAX_CONTENT_LENGTH = 5000;

    public ParsedSummary parse(String aiResponse) {
        String title = null;
        StringBuilder content = new StringBuilder();
        boolean readingContent = false;

        for (String line : aiResponse.split("\\R", -1)) {
            String trimmed = line.trim();
            if (startsWithTitleMarker(trimmed)) {
                title = markerValue(trimmed);
                readingContent = false;
            } else if (startsWithContentMarker(trimmed)) {
                appendContentLine(content, markerValue(trimmed));
                readingContent = true;
            } else if (readingContent) {
                appendContentLine(content, line);
            }
        }

        if (title == null || title.isBlank()) {
            title = DEFAULT_TITLE;
        }

        String contentText = content.toString().trim();
        if (contentText.isBlank()) {
            contentText = stripKnownMarkers(aiResponse).trim();
        }

        return new ParsedSummary(truncate(title.trim(), MAX_TITLE_LENGTH), truncate(contentText, MAX_CONTENT_LENGTH));
    }

    private boolean startsWithTitleMarker(String line) {
        return line.startsWith("TITLE:") || line.startsWith("标题：");
    }

    private boolean startsWithContentMarker(String line) {
        return line.startsWith("CONTENT:") || line.startsWith("内容：");
    }

    private String markerValue(String line) {
        int asciiColon = line.indexOf(':');
        int fullWidthColon = line.indexOf('：');
        int markerEnd;
        if (asciiColon >= 0 && fullWidthColon >= 0) {
            markerEnd = Math.min(asciiColon, fullWidthColon);
        } else {
            markerEnd = Math.max(asciiColon, fullWidthColon);
        }
        return markerEnd >= 0 ? line.substring(markerEnd + 1).trim() : "";
    }

    private void appendContentLine(StringBuilder content, String line) {
        if (!content.isEmpty()) {
            content.append('\n');
        }
        content.append(line);
    }

    private String stripKnownMarkers(String text) {
        return text.replace("TITLE:", "")
                .replace("CONTENT:", "")
                .replace("标题：", "")
                .replace("内容：", "");
    }

    private String truncate(String value, int maxLength) {
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    public record ParsedSummary(String title, String content) {
    }
}
