package com.diaryproject.backend.auth.oauth.service;

import com.diaryproject.backend.common.exception.BadRequestException;

import java.util.Locale;

public enum OAuthProvider {
    QQ("qq"),
    WECHAT("wechat");

    private final String value;

    OAuthProvider(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static OAuthProvider from(String provider) {
        if (provider == null) {
            throw new BadRequestException("Unsupported OAuth provider");
        }
        String normalized = provider.toLowerCase(Locale.ROOT);
        for (OAuthProvider item : values()) {
            if (item.value.equals(normalized)) {
                return item;
            }
        }
        throw new BadRequestException("Unsupported OAuth provider");
    }
}
