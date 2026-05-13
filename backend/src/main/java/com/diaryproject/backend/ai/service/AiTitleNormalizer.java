package com.diaryproject.backend.ai.service;

import org.springframework.stereotype.Component;

@Component
public class AiTitleNormalizer {

    private static final int MAX_TITLE_LENGTH = 15;

    public String normalize(String rawTitle) {
        if (rawTitle == null) {
            return "";
        }

        String title = rawTitle.trim();
        if ((title.startsWith("\"") && title.endsWith("\""))
                || (title.startsWith("'") && title.endsWith("'"))) {
            title = title.substring(1, title.length() - 1);
        }

        title = title.trim();
        return title.length() > MAX_TITLE_LENGTH ? title.substring(0, MAX_TITLE_LENGTH) : title;
    }
}
