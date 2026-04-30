package com.diaryproject.backend.common.cache;

import java.time.Duration;

/**
 * Central constants for cache key prefixes and TTL values.
 * <p>
 * This is a utility class — not intended to be instantiated.
 */
public final class CacheConstants {

    private CacheConstants() {
        throw new UnsupportedOperationException("Utility class — cannot be instantiated");
    }

    /** Prefix for JWT token blacklist entries. */
    public static final String TOKEN_BLACKLIST_PREFIX = "token:blacklist:";

    /** Time-to-live for cached user entities. */
    public static final Duration USER_CACHE_TTL = Duration.ofMinutes(30);

    /** Time-to-live for cached user details (authentication). */
    public static final Duration USER_DETAILS_CACHE_TTL = Duration.ofMinutes(30);

    /** Time-to-live for cached analysis results (daily / weekly / monthly). */
    public static final Duration ANALYSIS_CACHE_TTL = Duration.ofMinutes(15);

    /** Time-to-live for cached schedule entries. */
    public static final Duration SCHEDULE_CACHE_TTL = Duration.ofMinutes(5);

    /** Time-to-live for cached diary entries. */
    public static final Duration DIARY_CACHE_TTL = Duration.ofMinutes(5);

    /** Time-to-live for cached user settings. */
    public static final Duration SETTINGS_CACHE_TTL = Duration.ofMinutes(30);
}
